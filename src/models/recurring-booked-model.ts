import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {RecurringTransactionModel} from "./recurring-transaction-model";
import {TransactionModel} from "./transaction-model";


@Entity({
    name: 'recurring_booked'
})
export class RecurringBookedModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    recurring_uuid!: string;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    transaction_uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @ManyToOne(() => RecurringTransactionModel, m => m.bookedTransactions)
    @JoinColumn({name: 'recurring_uuid', referencedColumnName: 'uuid'})
    recurringTransaction!: RecurringTransactionModel;

    @ManyToOne(() => TransactionModel, m => m.recurringBooked)
    @JoinColumn({name: 'transaction_uuid', referencedColumnName: 'uuid'})
    transaction!: TransactionModel;
}