import {getConnection} from "../core/database";
import {CategoryModel} from "../models/category-model";
import {ResultSetHeader} from "mysql2";


export interface Category {
    id: number;
    name: string;
}

const categoryCache: { [orgId: string]: Category[] } = {};
const categoryLookupCache: { [orgId: string]: { [id: number]: string } } = {};
const categoryReverseLookupCache: { [orgId: string]: { [id: string]: number } } = {};

const updateCache = (orgId: string, categories: Category[]) => {
    categoryCache[orgId] = categories;

    let lookup: { [id: number]: string } = {};
    let reverseLookup: { [id: string]: number } = {};
    categories.forEach(category => {
        lookup[category.id] = category.name;
        reverseLookup[category.name] = category.id;
    });

    categoryLookupCache[orgId] = lookup;
    categoryReverseLookupCache[orgId] = reverseLookup;
};

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

    updateCache(organizationId, categories);
    return categories;
}

export async function getCategoriesLookup(organizationId: string): Promise<{ [id: number]: string }> {
    let lookup = categoryLookupCache[organizationId];
    if (!lookup) {
        await getCategories(organizationId);

        lookup = categoryLookupCache[organizationId];
        if (!lookup) {
            throw new Error('Fatal cache error');
        }
    }

    return lookup;
}

export async function getCategoriesReverseLookup(organizationId: string): Promise<{ [id: string]: number }> {
    let lookup = categoryReverseLookupCache[organizationId];
    if (!lookup) {
        await getCategories(organizationId);

        lookup = categoryReverseLookupCache[organizationId];
        if (!lookup) {
            throw new Error('Fatal cache error');
        }
    }

    return lookup;
}

export async function insertCategory(organizationId: string, category: Category): Promise<number> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO cantropee.categories (organization_uuid, name) VALUES (UUID_TO_BIN(?),?)',
        [organizationId, category.name]
    );
    conn.release();

    delete categoryCache[organizationId];
    return result.insertId;
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
