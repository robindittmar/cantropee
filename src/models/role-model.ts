import {Column, Entity, OneToMany, PrimaryColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {OrganizationUserModel} from "./organization-user-model";


@Entity({
    name: 'roles'
})
export class RoleModel {
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

    @Column()
    name!: string;

    @Column({
        type: 'json'
    })
    privileges!: string[];

    @OneToMany(() => OrganizationUserModel, m => m.role)
    organization_user!: OrganizationUserModel;
}
