import {Column, Entity, PrimaryColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


@Entity({
    name: 'sessions'
})
export class SessionModel {
    @Column()
    id!: number;

    @Column()
    insert_timestamp!: Date;

    @Column()
    valid_until!: Date;

    @PrimaryColumn()
    session_id!: string;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    user_uuid!: string;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    organization_uuid!: string;
}
