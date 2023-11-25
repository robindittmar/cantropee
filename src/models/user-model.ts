import {Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {UserSettingsModel} from "./user-settings-model";
import {OrganizationUserModel} from "./organization-user-model";


@Entity({
    name: 'users'
})
export class UserModel {
    @Column()
    id!: number;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    uuid!: string;

    @Column()
    email!: string;

    @Column({select: false})
    password!: string;

    @Column({select: false})
    require_password_change!: number;

    @Column()
    insert_timestamp!: Date;

    @OneToOne(() => UserSettingsModel, {eager: true})
    @JoinColumn({name: 'uuid', referencedColumnName: 'user_uuid'})
    settings!: UserSettingsModel;

    @OneToMany(() => OrganizationUserModel, m => m.user)
    organization_user!: OrganizationUserModel;
}
