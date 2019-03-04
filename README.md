# Gatsby Source Custom API

**Gatsby Source Custom API** helps you sourcing data from any API and transform it into Gatsby-nodes. Define keys you want to be transformed to image-nodes and use them with Gatsy Image.

## Getting Started

1. Install the package with **npm** or **yarn**

   `npm install gatsby-source-json-api`

   `yarn add gatsby-source-json-api`

2. Add to plugins in your gatsby-config.js

```javascript
module.exports = {
    {
      resolve: 'gatsby-source-json-api',
      options: {
        url: {
          development: 'http://your-local-api.dev',
          production: 'https://remote-api-server.de/',
        }
      },
    },
}
```

## Options

| **Name**  | **Type**         | **Description**                                                                                                                                                                                |
| :-------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| url       | object or string | `Required.` Url of your API as a string. If you have two different APIs for development and production, define an object with the keys `production` and `development`.                         |
| rootKey   | string           | `Optional.` Name your API.                                                                                                                                                                     |
| imageKeys | array            | Define the keys of image-objects you want to transform to image-nodes, that can be used with Gatsby Image. This objects need to have a key called `url` as image-source. Default: `['image']`. |

### Transform Nodes to Pages

Here's a sample of how you use the required nodes to automatically generate pages: Insert the following code into the file `gatsby-node.js`. The sample key here is an array called `posts`. All array-elements can be required in GraphQl via `allPosts`.

```javascript
const path = require('path')

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions
  const result = await graphql(`
    {
      allPosts {
        edges {
          node {
            url
          }
        }
      }
    }
  `)
  return Promise.all(
    result.data.allPosts.edges.map(async ({ node }) => {
      await createPage({
        path: node.url,
        component: path.resolve('./src/pages/post.js'),
        context: {
          // Data passed to context is available
          // in page queries as GraphQL variables.
          slug: node.url,
        },
      })
    })
  )
}
```

In your `pages/post.js` you can require the data like so:

```javascript
export const query = graphql`
  query($slug: String) {
    posts(url: { eq: $slug }) {
      url
      title
      image {
        local {
          childImageSharp {
            fluid(maxWidth: 2000) {
              ...GatsbyImageSharpFluid_withWebp
            }
          }
        }
        alttext
      }
    }
  }
`
```

## Contributing

Every contribution is very much appreciated.
Feel free to file bugs, feature- and pull-requests.

**If this plugin is helpful for you, star it on [GitHub](https://github.com/AndreasFaust/gatsby-source-json-api).**
