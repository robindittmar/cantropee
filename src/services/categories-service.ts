import {getConnection} from "../core/database";
import {CategoryModel} from "../models/category-model";
import {ResultSetHeader} from "mysql2/index";


export interface Category {
    id: number;
    name: string;
}

export async function getCategories(organizationId: string): Promise<Category[]> {
    let categories: Category[] = [];

    const conn = await getConnection();
    const [result] = await conn.query<CategoryModel[]>(
        'SELECT id, name FROM cantropee.categories WHERE organization_id = UUID_TO_BIN(?)',
        [organizationId]
    );
    conn.release();

    for (const category of result) {
        categories.push({
            id: category.id,
            name: category.name,
        });
    }

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
        'INSERT INTO cantropee.categories (organization_id, name) VALUES (UUID_TO_BIN(?),?)',
        [organizationId, category.name]
    );
    conn.release();

    return result.affectedRows > 0;
}

export async function updateCategory(category: Category): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'UPDATE cantropee.categories SET name = ? WHERE id = ?',
        [category.name, category.id]
    );
    conn.release();

    return result.affectedRows > 0;
}
