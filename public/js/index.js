(() => {
    const {createApp} = Vue;

    createApp({
        data: () => ({
            balance: {
                total: {amount: '0.0', currency: 'EUR'},
                history: [],
            },
        }),
        created() {
            this.fetchData();
        },
        methods: {
            async fetchData() {
                const res = await fetch('/api/transactions');
                let balance = await res.json();
                balance.history = balance.history.map(t => {
                    t.effectiveTimestamp = new Date(t.effectiveTimestamp);
                    t.isPositive = t.value.amount > 0;
                    return t;
                });

                this.balance = balance;
                this.loading = false;
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