const resetDepositValues = () => {
    document.querySelector('#depositValue').value = '0.00';
    document.querySelector('#depositDateTime').value = makeLocalDateStringForInput();
};

const resetWithdrawValues = () => {
    document.querySelector('#withdrawValue').value = '0.00';
    document.querySelector('#withdrawValue19').value = '0.00';
    document.querySelector('#withdrawValue7').value = '0.00';
    document.querySelector('#withdrawVat19').value = '0.00';
    document.querySelector('#withdrawVat7').value = '0.00';
    document.querySelector('#withdrawDateTime').value = makeLocalDateStringForInput();
};

(() => {
    const TIMEZONE_OFFSET = (new Date()).getTimezoneOffset() * 60000;

    makeLocalDateStringForInput = () => {
        return new Date(Date.now() - TIMEZONE_OFFSET).toISOString().slice(0, 16);
    };
    convertLocalDateStringForInput = dt => {
        return new Date(dt.getTime() - TIMEZONE_OFFSET).toISOString().slice(0, 16);
    };

    window.onload = () => {
        const depositModal = document.querySelector('#depositModal');
        depositModal.addEventListener('shown.bs.modal', () => {
            document.querySelector('#depositDateTime').value = makeLocalDateStringForInput();
        });

        const withdrawModal = document.querySelector('#withdrawModal');
        withdrawModal.addEventListener('shown.bs.modal', () => {
            document.querySelector('#withdrawDateTime').value = makeLocalDateStringForInput();
        });

        resetDepositValues();
        resetWithdrawValues();

        const withdrawValue = document.querySelector('#withdrawValue');
        const withdrawValue19 = document.querySelector('#withdrawValue19');
        const withdrawValue7 = document.querySelector('#withdrawValue7');
        const withdrawVat19 = document.querySelector('#withdrawVat19');
        const withdrawVat7 = document.querySelector('#withdrawVat7');

        withdrawValue.addEventListener('change', () => {
            withdrawValue19.value = withdrawValue.value;
            withdrawValue19.dispatchEvent(new Event('change'));
        });

        withdrawValue19.addEventListener('change', () => {
            let value = withdrawValue.value * 100;
            let value19 = withdrawValue19.value * 100;
            let value7 = value - value19;

            let vat19 = Math.round((value19 / 119) * 19);
            let vat7 = Math.round((value7 / 107) * 7);

            withdrawValue7.value = (value7 / 100).toFixed(2);
            withdrawVat19.value = (vat19 / 100).toFixed(2);
            withdrawVat7.value = (vat7 / 100).toFixed(2);
        });

        withdrawValue7.addEventListener('change', () => {
            let value = withdrawValue.value * 100;
            let value7 = withdrawValue7.value * 100;
            let value19 = value - value7;

            let vat19 = Math.round((value19 / 119) * 19);
            let vat7 = Math.round((value7 / 107) * 7);

            withdrawValue19.value = (value19 / 100).toFixed(2);
            withdrawVat19.value = (vat19 / 100).toFixed(2);
            withdrawVat7.value = (vat7 / 100).toFixed(2);
        });
    };

    const navigationStep = 10;

    const {createApp} = Vue;
    createApp({
        data: () => ({
            effectiveFrom: new Date(),
            effectiveTo: new Date(),
            balance: {
                total: {amount: 0, currency: 'EUR'},
                isPositive: true,
                vat: {
                    total: {amount: 0, currency: 'EUR'},
                    vat19: {amount: 0, currency: 'EUR'},
                    vat7: {amount: 0, currency: 'EUR'},
                }
            },
            categories: [],
            detailTransaction: {
                id: 0,
                category: '',
                insertTimestamp: new Date(0),
                effectiveTimestamp: new Date(0),
                value: {amount: 0, currency: 'EUR'},
                value7: {amount: 0, currency: 'EUR'},
                value19: {amount: 0, currency: 'EUR'},
                vat7: {amount: 0, currency: 'EUR'},
                vat19: {amount: 0, currency: 'EUR'},
            },
            transactions: {
                start: 0,
                count: navigationStep,
                total: -1,
                data: [],
            },
        }),
        created() {
            const now = new Date();
            this.effectiveFrom = new Date(now.getFullYear(), now.getMonth());
            this.effectiveTo = now;
            // this.effectiveTo = new Date(now.getFullYear(), now.getMonth() + 1);
            // this.effectiveFrom = new Date(0);

            this.fetchBalance();
            this.fetchTransactions();
            this.fetchCategories();
        },
        methods: {
            async fetchBalance() {
                const res = await fetch(`/api/transactions/balance?from=${this.dateToURI(this.effectiveFrom)}&to=${this.dateToURI(this.effectiveTo)}`);
                this.balance = await res.json();
                this.balance.isPositive = this.balance.total.amount >= 0;
            },
            async fetchCategories() {
                const res = await fetch('/api/categories');
                this.categories = await res.json();
            },
            async fetchTransactions() {
                const res = await fetch(`/api/transactions?from=${this.dateToURI(this.effectiveFrom)}&to=${this.dateToURI(this.effectiveTo)}&start=${this.transactions.start}&count=${navigationStep}`);
                let paginatedResult = await res.json();

                paginatedResult.data = paginatedResult.data.map(t => {
                    t.effectiveTimestamp = new Date(t.effectiveTimestamp);
                    t.isPositive = t.value.amount >= 0;
                    return t;
                });

                this.transactions = paginatedResult;
            },
            async submitDeposit() {
                const depositValue = document.querySelector('#depositValue');
                const depositCategory = document.querySelector('#depositCategory');
                const depositDateTime = document.querySelector('#depositDateTime');

                const payload = {
                    effectiveTimestamp: new Date(depositDateTime.value),
                    category: depositCategory.value,
                    value: depositValue.value * 100,
                    value19: 0,
                    value7: 0,
                    vat19: 0,
                    vat7: 0,
                };

                const res = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                });

                await this.fetchBalance();
                await this.fetchTransactions();

                resetDepositValues();
            },
            async submitWithdrawal() {
                const withdrawValue = document.querySelector('#withdrawValue');
                const withdrawValue19 = document.querySelector('#withdrawValue19');
                const withdrawValue7 = document.querySelector('#withdrawValue7');
                const withdrawVat19 = document.querySelector('#withdrawVat19');
                const withdrawVat7 = document.querySelector('#withdrawVat7');
                const withdrawCategory = document.querySelector('#withdrawCategory');
                const withdrawDateTime = document.querySelector('#withdrawDateTime');

                const payload = {
                    effectiveTimestamp: new Date(withdrawDateTime.value),
                    category: withdrawCategory.value,
                    value: -(withdrawValue.value * 100),
                    value19: -(withdrawValue19.value * 100),
                    value7: -(withdrawValue7.value * 100),
                    vat19: -(withdrawVat19.value * 100),
                    vat7: -(withdrawVat7.value * 100),
                };

                const res = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                });

                await this.fetchBalance();
                await this.fetchTransactions();

                resetWithdrawValues();
            },
            async spawnTransactionModal(transactionId) {
                const res = await fetch(`/api/transactions/${transactionId}`);
                this.detailTransaction = await res.json();

                const transModal = new bootstrap.Modal(document.getElementById('transactionModal'));
                transModal.show();
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
            amountToString(m) {
                return (m.amount / 100).toFixed(2);
            },
            dateToString(d) {
                const localeOptions = {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                };
                return d.toLocaleString('de-DE', localeOptions);
            },
            dateToURI(d) {
                return encodeURI(d.toISOString());
            },
            convertLocalDateStringForInput(dt) {
                return new Date(dt.getTime() - TIMEZONE_OFFSET).toISOString().slice(0, 16);
            },
        }
    }).mount('#app');
})();