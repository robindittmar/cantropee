import {getConnection} from "../core/database";
import {CategoryModel} from "../models/category-model";
import {ResultSetHeader} from "mysql2";


export interface Category {
    id: number;
    name: string;
}

const categoryCache: { [orgId: string]: Category[] } = {};

export async function getCategories(organizationId: string): Promise<Category[]> {
    let categories: Category[] = categoryCache[organizationId] ?? [];
    if (categories.length > 0) {
        return categories;
    }

    const conn = await getConnection();
    const [result] = await conn.query<CategoryModel[]>(
        'SELECT id, name FROM cantropee.categories WHERE organization_uuid = UUID_TO_BIN(?)',
        [organizationId]
    );
    conn.release();

    for (const category of result) {
        categories.push({
            id: category.id,
            name: category.name,
        });
    }

    categoryCache[organizationId] = categories;
    return categories;
}

export async function getCategoriesLookup(organizationId: string): Promise<{ [id: number]: string }> {
    const categories = await getCategories(organizationId);
    let lookup: { [id: number]: string } = {};
    categories.forEach(category => {
        lookup[category.id] = category.name;
    });

    return lookup;
}

export async function getCategoriesReverseLookup(organizationId: string): Promise<{ [id: string]: number }> {
    const categories = await getCategories(organizationId);
    let lookup: { [id: string]: number } = {};
    categories.forEach(category => {
        lookup[category.name] = category.id;
    });

    return lookup;
}

export async function insertCategory(organizationId: string, category: Category): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.categories (organization_uuid, name) VALUES (UUID_TO_BIN(?),?)',
        [organizationId, category.name]
    );
    conn.release();

    delete categoryCache[organizationId];
    return result.affectedRows > 0;
}

export async function updateCategory(organizationId: string, category: Category): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.categories SET name = ?' +
        ' WHERE id = ?' +
        ' AND organization_uuid = UUID_TO_BIN(?)',
        [category.name, category.id, organizationId]
    );
    conn.release();

    delete categoryCache[organizationId];
    return result.affectedRows > 0;
}
