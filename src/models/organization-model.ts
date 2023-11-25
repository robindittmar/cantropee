import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";
import {OrganizationUserModel} from "./organization-user-model";


@Entity({
    name: 'organizations'
})
export class OrganizationModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    uuid!: string;

    @Column()
    insert_timestamp!: Date;

    @Column()
    name!: string;

    @Column()
    currency!: string;

    @Column()
    uses_taxes!: number;

    @Column()
    preview_recurring_count!: number;

    @OneToMany(() => OrganizationUserModel, m => m.organization)
    organization_user!: OrganizationUserModel;
}
