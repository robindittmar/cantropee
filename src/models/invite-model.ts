import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


@Entity({
    name: 'invites'
})
export class InviteModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    issued_by!: string;

    @Column()
    expires_at!: Date;

    @Column()
    accepted_at?: Date;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    accepted_by?: string;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    organization_uuid?: string;
}