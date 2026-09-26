import { deletionTimeSql } from "@/storage/sqlite/timestamps";
import { withDatabase } from "@/storage/sqlite/initialize";
export async function getAllCategories() {
  return withDatabase(async db => {
    return await db.getAllAsync("SELECT id, name, updated_at, deleted_at FROM categories WHERE deleted_at IS NULL");
  });
}
export async function addCategory(name) {
  return withDatabase(async db => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await db.runAsync("INSERT INTO categories (id, name) VALUES (?, ?)", [id, name]);
    return {
      id,
      name
    };
  });
}
export async function updateCategory(cat) {
  return withDatabase(async db => {
    await db.runAsync("UPDATE categories SET name=? WHERE deleted_at IS NULL AND id=?", [cat.name, cat.id]);
  });
}
export async function deleteCategory(id) {
  return withDatabase(async db => {
    await db.runAsync("UPDATE tasks SET category_id=NULL WHERE deleted_at IS NULL AND category_id=?", [id]);
    await db.runAsync(`UPDATE categories SET deleted_at=${deletionTimeSql} WHERE deleted_at IS NULL AND id=?`, [id]);
  }, {
    transaction: true
  });
}
