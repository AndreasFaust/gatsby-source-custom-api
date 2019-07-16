const path = require('path')

// exports.createPages = async ({ graphql, actions }) => {
//   const { createPage } = actions
//   const result = await graphql(`
//       {
//           allArticles {
//               edges {
//                   node {
//                       url
//                   }
//               }
//           }

//       }
//   `)
//   return Promise.all(
//     result.data.allArticles.edges.map(async ({ node }) => {
//       console.log(node.url)
//       await createPage({
//         path: node.url,
//         component: path.resolve('./src/pages/post.js'),
//         context: {
//           // Data passed to context is available
//           // in page queries as GraphQL variables.
//           slug: node.url,
//         },
//       })
//     }),
//   )
// }