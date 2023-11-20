import {AppDataSource} from "../core/database";
import {CategoryModel} from "../models/category-model";
import {countTransactionsByCategory} from "./transaction-service";
import {ServerError} from "../core/server-error";


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

    const models = await AppDataSource.manager.find(CategoryModel, {
        where: {
            organization_uuid: organizationId
        }
    });

    for (const model of models) {
        categories.push({
            id: model.id,
            name: model.name,
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
    const model = new CategoryModel();
    model.organization_uuid = organizationId;
    model.name = category.name;
    await AppDataSource.manager.save(model);

    delete categoryCache[organizationId];
    return model.id;
}

export async function updateCategory(organizationId: string, category: Category): Promise<boolean> {
    const model = new CategoryModel();
    model.id = category.id;
    model.name = category.name;
    model.organization_uuid = organizationId;
    await AppDataSource.manager.save(model);

    delete categoryCache[organizationId];
    return true;
}

export async function deleteCategory(organizationId: string, categoryId: number): Promise<boolean> {
    const count = await countTransactionsByCategory(organizationId, categoryId);
    if (count > 0) {
        throw new ServerError(500, 'Cannot delete category as there are transactions associated with it');
    }

    const model = new CategoryModel();
    model.id = categoryId;
    model.organization_uuid = organizationId;
    await AppDataSource.manager.remove(model);

    delete categoryCache[organizationId];
    return true;
}
