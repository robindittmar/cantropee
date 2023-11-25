import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {TransformUuid} from "../core/transform";


@Entity({
    name: 'categories'
})
export class CategoryModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @PrimaryColumn({
        type: 'binary',
        length: 16,
        transformer: TransformUuid,
    })
    organization_uuid!: string;

    @Column()
    name!: string;

    @Column()
    insert_timestamp!: Date;
}
