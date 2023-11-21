import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from "typeorm";
import {OrganizationModel} from "./organization-model";
import {TransformUuid} from "../core/transform";
import {RoleModel} from "./role-model";
import {UserModel} from "./user-model";


@Entity({
    name: 'organization_users'
})
export class OrganizationUserModel {
    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    organization_uuid!: string;

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
    role_uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @ManyToOne(() => OrganizationModel, m => m.organization_user)
    @JoinColumn({name: 'organization_uuid', referencedColumnName: 'uuid'})
    organization!: OrganizationModel;

    @ManyToOne(() => UserModel, m => m.organization_user)
    @JoinColumn({name: 'user_uuid', referencedColumnName: 'uuid'})
    user!: UserModel;

    @ManyToOne(() => RoleModel, m => m.organization_user)
    @JoinColumn({name: 'role_uuid', referencedColumnName: 'uuid'})
    role!: RoleModel;
}