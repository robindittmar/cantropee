import {Column, Entity, JoinColumn, ManyToOne, PrimaryColumn} from "typeorm";
import {OrganizationModel} from "./organization-model";
import {TransformUuid} from "../core/transform";
import {RoleModel} from "./role-model";


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

    @Column()
    role_uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @ManyToOne(() => OrganizationModel, m => m.organization_user)
    @JoinColumn({name: 'organization_uuid', referencedColumnName: 'uuid'})
    organization!: OrganizationModel;

    @ManyToOne(() => RoleModel, m => m.organization_user)
    @JoinColumn({name: 'role_uuid', referencedColumnName: 'uuid'})
    role!: RoleModel;
}