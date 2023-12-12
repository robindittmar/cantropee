import {Column, Entity, JoinColumn, OneToMany, PrimaryColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {RecurringBookedModel} from "./recurring-booked-model";


@Entity({
    name: 'recurring_transactions'
})
export class RecurringTransactionModel {
    @Column()
    id!: number;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    uuid!: string;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    organization_uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    created_by_uuid!: string;

    @Column()
    active!: boolean;

    @Column()
    timezone!: string;

    @Column()
    execution_policy!: number;

    @Column({type: 'json'})
    execution_policy_data!: object | null;

    @Column()
    first_execution!: Date;

    @Column()
    next_execution!: Date;

    @Column({
        nullable: true,
    })
    last_execution?: Date;

    @Column()
    category_id!: number;

    @Column()
    value!: number;

    @Column({
        nullable: true
    })
    value19?: number;

    @Column({
        nullable: true
    })
    value7?: number;

    @Column({
        nullable: true
    })
    vat19?: number;

    @Column({
        nullable: true
    })
    vat7?: number;

    @Column({
        nullable: true
    })
    note?: string;

    @OneToMany(() => RecurringBookedModel, m => m.recurringTransaction)
    @JoinColumn({name: 'uuid', referencedColumnName: 'recurring_uuid'})
    bookedTransactions!: RecurringBookedModel;
}
