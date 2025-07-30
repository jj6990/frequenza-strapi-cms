'use strict';

const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const mime = require('mime-types');

async function importBlogPostsFromCSV(csvFilePath) {
  const results = [];

  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          await processBlogPosts(results);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

async function processBlogPosts(posts) {
  for (const post of posts) {
    try {
      // Transform CSV data to match your blog-post schema
      const blogPostData = {
        title: post.title,
        slug: post.slug || generateSlug(post.title),
        excerpt: post.excerpt || '',
        content: post.content || '',
        publishAt: post.publishAt ? new Date(post.publishAt) : new Date(),
        // Handle category relation if category name is provided
        category: post.category ? await findOrCreateCategory(post.category) : null,
      };

      // Handle featured image if provided
      if (post.featuredImage) {
        const imageFile = await uploadImageIfExists(post.featuredImage);
        if (imageFile) {
          blogPostData.featuredImage = imageFile;
        }
      }

      // Create the blog post
      await strapi.documents('api::blog-post.blog-post').create({
        data: blogPostData,
      });

      console.log(`Created blog post: ${post.title}`);
    } catch (error) {
      console.error(`Error creating blog post ${post.title}:`, error);
    }
  }
}

async function findOrCreateCategory(categoryName) {
  // Try to find existing category
  let category = await strapi.query('api::category.category').findOne({
    where: { name: categoryName },
  });

  // Create if doesn't exist
  if (!category) {
    category = await strapi.query('api::category.category').create({
      data: {
        name: categoryName,
        slug: generateSlug(categoryName),
      },
    });
  }

  return category.id;
}

async function uploadImageIfExists(imageFileName) {
  const imagePath = path.join('data', 'uploads', imageFileName);
  
  if (await fs.pathExists(imagePath)) {
    const fileData = getFileData(imageFileName);
    const [file] = await uploadFile(fileData, imageFileName);
    return file;
  }
  
  return null;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getFileData(fileName) {
  const filePath = path.join('data', 'uploads', fileName);
  const size = fs.statSync(filePath).size;
  const ext = fileName.split('.').pop();
  const mimeType = mime.lookup(ext || '') || '';

  return {
    filepath: filePath,
    originalFileName: fileName,
    size,
    mimetype: mimeType,
  };
}

async function uploadFile(file, name) {
  return strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: file,
      data: {
        fileInfo: {
          alternativeText: `An image uploaded to Strapi called ${name}`,
          caption: name,
          name,
        },
      },
    });
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');

  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  app.log.level = 'error';

  const csvFilePath = process.argv[2];
  if (!csvFilePath) {
    console.error('Please provide a CSV file path');
    process.exit(1);
  }

  try {
    await importBlogPostsFromCSV(csvFilePath);
    console.log('CSV import completed successfully');
  } catch (error) {
    console.error('CSV import failed:', error);
  }

  await app.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 