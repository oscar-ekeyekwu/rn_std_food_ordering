import { ID } from "react-native-appwrite";
import { appWriteConfig, databases, storage } from "./appwrite";
import dummyData from "./data";

interface Category {
  name: string;
  description: string;
}

interface Customization {
  name: string;
  price: number;
  type: "topping" | "side" | "size" | "crust" | string; // extend as needed
}

interface MenuItem {
  name: string;
  description: string;
  image_url: string;
  price: number;
  rating: number;
  calories: number;
  protein: number;
  category_name: string;
  customizations: string[]; // list of customization names
}

interface DummyData {
  categories: Category[];
  customizations: Customization[];
  menu: MenuItem[];
}

// ensure dummyData has correct shape
const data = dummyData as DummyData;

async function clearAll(collectionId: string): Promise<void> {
  const list = await databases.listDocuments(
    appWriteConfig.databaseId,
    collectionId
  );

  await Promise.all(
    list.documents.map((doc) =>
      databases.deleteDocument(appWriteConfig.databaseId, collectionId, doc.$id)
    )
  );
}

async function clearStorage(): Promise<void> {
  const list = await storage.listFiles(appWriteConfig.bucketId);

  await Promise.all(
    list.files.map((file) =>
      storage.deleteFile(appWriteConfig.bucketId, file.$id)
    )
  );
}

async function uploadImageToStorage(imageUrl: string) {
  console.log("Fetching image ...");

  const response = await fetch(imageUrl);
  console.log("Image fetched ...");
  const blob = await response.blob();

  const fileObj = {
    name: imageUrl.split("/").pop() || `file-${Date.now()}.jpg`,
    type: blob.type,
    size: blob.size,
    uri: imageUrl,
  };

  console.log("creating file on appwrite ...");
  const file = await storage.createFile(
    appWriteConfig.bucketId,
    ID.unique(),
    fileObj
  );

  console.log("creating file on appwrite ...");

  return storage.getFileViewURL(appWriteConfig.bucketId, file.$id);
}

async function seed(): Promise<void> {
  console.log("Seeding started ...");
  // 1. Clear all
  await clearAll(appWriteConfig.categoriesCollectionId);
  await clearAll(appWriteConfig.customizationsCollectionId);
  await clearAll(appWriteConfig.menuCollectionId);
  await clearAll(appWriteConfig.menuCustomizationsCollectionId);
  await clearStorage();

  console.log("Existing records cleared ...");
  // 2. Create Categories
  const categoryMap: Record<string, string> = {};
  for (const cat of data.categories) {
    const doc = await databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.categoriesCollectionId,
      ID.unique(),
      cat
    );
    categoryMap[cat.name] = doc.$id;
  }

  console.log("Categories created ...");

  // 3. Create Customizations
  const customizationMap: Record<string, string> = {};
  for (const cus of data.customizations) {
    const doc = await databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.customizationsCollectionId,
      ID.unique(),
      {
        name: cus.name,
        price: cus.price,
        type: cus.type,
      }
    );
    customizationMap[cus.name] = doc.$id;
  }

  console.log("Customizations created ...");

  // 4. Create Menu Items
  const menuMap: Record<string, string> = {};
  for (const item of data.menu) {
    console.log(`Uploading Menu: ${item.name} image  => ${item.image_url} ...`);

    const uploadedImage = await uploadImageToStorage(item.image_url);
    console.log(`Menu ${item.name} image uploaded ...`);

    const doc = await databases.createDocument(
      appWriteConfig.databaseId,
      appWriteConfig.menuCollectionId,
      ID.unique(),
      {
        name: item.name,
        description: item.description,
        image_url: uploadedImage,
        price: item.price,
        rating: item.rating,
        calories: item.calories,
        protein: item.protein,
        categories: categoryMap[item.category_name],
      }
    );

    menuMap[item.name] = doc.$id;

    console.log(`Menu ${item.name} created ...`);

    // 5. Create menu_customizations
    for (const cusName of item.customizations) {
      await databases.createDocument(
        appWriteConfig.databaseId,
        appWriteConfig.menuCustomizationsCollectionId,
        ID.unique(),
        {
          menu: doc.$id,
          customization: customizationMap[cusName],
        }
      );
    }

    console.log(`Menu ${item.name} customizations created ...`);
  }

  console.log("✅ Seeding complete.");
}

export default seed;
