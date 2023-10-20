import {getConnection} from "../core/database";
import {CategoryModel} from "../models/category-model";
import {ResultSetHeader} from "mysql2/index";


export interface Category {
    id: number;
    name: string;
}

interface CategoryCache {
    dirty: boolean,
    data: Category[];
    lookup: { [id: number]: string };
    reverseLookup: { [id: string]: number };
}

const cache: CategoryCache = {
    dirty: true,
    data: [],
    lookup: {},
    reverseLookup: {},
};

function updateCache(data: Category[]) {
    cache.data = data;

    cache.lookup = {};
    cache.data.forEach((c) => {
        cache.lookup[c.id] = c.name;
        cache.reverseLookup[c.name] = c.id;
    });

    cache.dirty = false;
}

export async function getCategories(): Promise<Category[]> {
    if (!cache.dirty) {
        return cache.data;
    }

    let categories: Category[] = [];

    const conn = await getConnection();
    const [result] = await conn.query<CategoryModel[]>('SELECT * FROM `categories`');
    conn.release();

    for (const category of result) {
        categories.push({
            id: category.id,
            name: category.name,
        });
    }

    updateCache(categories);
    return cache.data;
}

export async function getCategoriesLookup(): Promise<{ [id: number]: string }> {
    if (cache.dirty) {
        await getCategories();
    }

    return cache.lookup;
}

export async function getCategoriesReverseLookup(): Promise<{ [id: string]: number }> {
    if (cache.dirty) {
        await getCategories();
    }

    return cache.reverseLookup;
}

export async function insertCategory(category: Category): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'INSERT INTO `categories` (name) VALUES (?)', [category.name]
    );
    conn.release();

    const success = result.affectedRows > 0;
    if (success) {
        cache.dirty = true;
    }

    return success;
}

export async function updateCategory(category: Category): Promise<boolean> {
    const conn = await getConnection();
    const [result] = await conn.query<ResultSetHeader>(
        'UPDATE `categories`' +
        ' SET name = ?' +
        ' WHERE id = ?',
        [category.name, category.id]
    );
    conn.release();

    const success = result.affectedRows > 0;
    if (success) {
        cache.dirty = true;
    }

    return success;
}
