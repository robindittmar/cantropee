import {Column, Entity, JoinColumn, OneToMany, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {RecurringBookedModel} from "./recurring-booked-model";


@Entity({
    name: 'transactions'
})
export class TransactionModel {
    @PrimaryGeneratedColumn()
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
    effective_timestamp!: Date;

    @Column()
    active!: boolean;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
        nullable: true,
    })
    ref_uuid!: string | null;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
        nullable: true,
    })
    current_version_uuid!: string | null;

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

    @OneToMany(() => RecurringBookedModel, m => m.transaction)
    @JoinColumn({name: 'uuid', referencedColumnName: 'transaction_uuid'})
    recurringBooked!: RecurringBookedModel;
}
