import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


@Entity({
    name: 'user_settings'
})
export class UserSettingsModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @PrimaryColumn({
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
    default_organization_uuid!: string;

    @Column()
    language!: string;

    @Column()
    private_mode!: boolean;

    @Column()
    default_preview_pending!: boolean;

    @Column()
    default_sorting_order_asc!: boolean;

    @Column({type: 'json'})
    extra!: object | null;
}