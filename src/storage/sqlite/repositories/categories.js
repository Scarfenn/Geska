import { withDatabase } from "@/storage/sqlite/initialize";
export async function getAllCategories() {
  return withDatabase(async db => {
    return await db.getAllAsync("SELECT id, name FROM categories");
  });
}
export async function addCategory(name) {
  return withDatabase(async db => {
    const id = Date.now().toString();
    await db.runAsync("INSERT INTO categories (id, name) VALUES (?, ?)", [id, name]);
    return {
      id,
      name
    };
  });
}
export async function updateCategory(cat) {
  return withDatabase(async db => {
    await db.runAsync("UPDATE categories SET name=? WHERE id=?", [cat.name, cat.id]);
  });
}
export async function deleteCategory(id) {
  return withDatabase(async db => {
    await db.runAsync("UPDATE tasks SET category_id=NULL WHERE category_id=?", [id]);
    await db.runAsync("DELETE FROM categories WHERE id=?", [id]);
  }, {
    transaction: true
  });
}
