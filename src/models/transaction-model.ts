import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


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

    @Column({})
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
        type: 'bigint',
        nullable: true
    })
    value19!: number | null;

    @Column({
        type: 'bigint',
        nullable: true
    })
    value7!: number | null;

    @Column({
        type: 'bigint',
        nullable: true
    })
    vat19!: number | null;

    @Column({
        type: 'bigint',
        nullable: true
    })
    vat7!: number | null;

    @Column({
        type: 'text',
        nullable: true
    })
    note!: string | null;
}
