import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


@Entity({
    name: 'balance',
})
export class BalanceModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
        default: () => '(UUID_TO_BIN(UUID()))',
    })
    organization_uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @Column()
    effective_from!: Date;

    @Column()
    effective_to!: Date;

    @Column()
    value!: number;

    @Column()
    vat19!: number;

    @Column()
    vat7!: number;

    @Column()
    pending_value!: number;

    @Column()
    pending_vat19!: number;

    @Column()
    pending_vat7!: number;

    @Column()
    valid_until!: Date;

    @Column()
    dirty!: number;
}
