(() => {
    const {createApp} = Vue;

    const navigationStep = 10;

    createApp({
        data: () => ({
            balance: {
                total: {amount: 0, currency: 'EUR'},
                taxes: {
                    total: {amount: 0, currency: 'EUR'},
                    vat19: {amount: 0, currency: 'EUR'},
                    vat7: {amount: 0, currency: 'EUR'},
                }
            },
            transactions: {
                start: 0,
                count: navigationStep,
                total: -1,
                data: [],
            },
        }),
        created() {
            this.fetchBalance();
            this.fetchTransactions();
        },
        methods: {
            async fetchBalance() {
                const res = await fetch('/api/transactions/balance');
                this.balance = await res.json();
                this.loading = false;
            },
            async fetchTransactions() {
                const res = await fetch(`/api/transactions?start=${this.transactions.start}&count=${navigationStep}`);
                let paginatedResult = await res.json();
                
                paginatedResult.data = paginatedResult.data.map(t => {
                    t.effectiveTimestamp = new Date(t.effectiveTimestamp);
                    t.isPositive = t.value.amount > 0;
                    return t;
                });

                this.transactions = paginatedResult;
            },
            async nextPage() {
                this.transactions.start += navigationStep;
                if (this.transactions.start >= this.transactions.total) {
                    this.transactions.start -= navigationStep;
                }

                await this.fetchTransactions();
            },
            async prevPage() {
                this.transactions.start -= navigationStep;
                if (this.transactions.start < 0) {
                    this.transactions.start = 0;
                }

                await this.fetchTransactions();
            },
            moneyToString(m) {
                return m.currency + ' ' + (m.amount / 100).toFixed(2);
            },
            dateToString(d) {
                const localeOptions = {weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'};
                return d.toLocaleString('de-DE', localeOptions);
            }
        }
    }).mount('#app');
})();