![Logo of gatsby-source-custom-api](https://github.com/andreasfaust/gatsby-source-custom-api/raw/master/gatsby-source-custom-api-logo.png)

**gatsby-source-custom-api** helps you sourcing data from any API and transform it into Gatsby nodes. Define keys you want to be transformed into image-nodes and use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

## Getting Started

1. Install the package with **yarn** or **npm**

`yarn add gatsby-source-custom-api`

2. Add to plugins in your gatsby-config.js

```javascript
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-custom-api",
            options: {
                url: "www.my-custom-api.com"
            }
        }
    ]
};
```

## Options

| **Name**  | **Type**         | **Description**                                                                                                                                                                                         |
| :-------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| url       | object or string | `Required.` Url of your API as a string. If you have two different APIs for development and production, define an object with the keys `production` and `development`.                                  |
| headers       | object | Request headers. Format is the identical to that accepted by the Headers constructor. See https://www.npmjs.com/package/node-fetch                                  |
| rootKey   | string           | `Optional.` Name your API.                                                                                                                                                                              |
| imageKeys | array            | Define the keys of image objects. These must have a childkey called `url`, which is a string that defines the path to an image file. Gatsby-Images are added as childkey `local`. Default: `['image']`. |
| schemas   | object           | Define default-schemas for the objects of your API. See "Provide Default Schemas" for more information.                                                                                                 |

## Provide Default Schemas

You need to provide default schemas for the arrays and objects of your API to avoid GraphQl-errors. You can provide default schemas via the prop `schemas`. More information: [https://graphql.org/learn/schema/](https://graphql.org/learn/schema/)

```javascript
// Lets assume this is the data from your API:
const exampleDataFromApi = [
    {
        url: "post-1",
        images: [
            {
                url: "image-1.jpg",
                modified: 1556752476267
            },
            {
                url: "image-2.jpg",
                modified: 1556752702168
            }
        ],
        author: {
            firstname: "John",
            lastname: "Doe"
        }
    }
];

// This is the content of your gatsby-config.js
// and what you need to provide as schema:
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-custom-api",
            options: {
                url: {
                    development: "http://my-local-api.dev", // on "gatsby develop"
                    production: "https://my-remote-api.com" // on "gatsby build"
                },
                imageKeys: ["images"],
                rootKey: "posts",
                schemas: {
                    posts: `
                        url: String
                        images: [images]
                        author: author
                    `,
                    images: `
                        url: String
                        modified: Int
                    `,
                    author: `
                        firstname: String
                        lastname: String
                    `
                }
            }
        }
    ]
};
```

## Multiple Sources? Multiple Instances!

If you have multiple sources for your API in your project, just instantiate the plugin multiple times. Just be sure to set a different `rootKey` for every instance. 

**Connect different APIs**
You can connect the different APIs with `@link`. Find out more about this at https://www.gatsbyjs.org/docs/schema-customization/#foreign-key-fields.

```javascript
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-custom-api",
            options: {
                url: "https://my-first-api.com",
                rootKey: 'authors',
                schemas:  {
                    authors: `
                        name: String
                        description: String
                    `
                }
            }
        },
        {
            resolve: "gatsby-source-custom-api",
            options: {
                url: "https://my-second-api.com",
                rootKey: 'posts',
                schemas:  {
                    posts: `
                        text: String
                        authors: authors @link(by: "name")
                    `
                }
            }
        }
    ]
};
```

## Images

`Gatsby Source Custom API` automatically downloads your image-files, so you can use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

#### How does it recognize images?

The default key for images is `image`. You can also define your own image keys with the option `imageKeys`. Images have to be objects containing a childkey called `url`, which is a string that defines the path to an image file. Gatsby-Images are added as childkey `local`.

#### What about Caching?

If your image object provides a key called `modified`, this key gets cached and compared every time you build or develop. If it stays the same, the already downloaded version of the image-file is used.

## Transform Nodes to Pages

This is an example of how you use the required nodes to automatically generate pages: Insert the following code into the file `gatsby-node.js`. The sample key here is an array called `posts`. All array-elements can be required in GraphQl via `allPosts`. In this example the posts have a child-key called "url", which defines their path and serves as marker to find them in your matching React-component (`pages/post.js`).

```javascript
const path = require("path");

exports.createPages = async ({ graphql, actions }) => {
    const { createPage } = actions;
    const result = await graphql(`
        {
            allPosts {
                nodes {
                    url
                }
            }
        }
    `);
    return Promise.all(
        result.data.allPosts.nodes.map(async node => {
            await createPage({
                path: node.url,
                component: path.resolve("./src/pages/post.js"),
                context: {
                    // Data passed to context is available
                    // in page queries as GraphQL variables.
                    url: node.url
                }
            });
        })
    );
};
```

In your `pages/post.js` you can require the data like so:

```jsx
import React from "react";
import { graphql } from "gatsby";

const Post = ({ data }) => {
    return <h1>{data.posts.title}</h1>;
};

export const query = graphql`
    query($url: String) {
        posts(url: { eq: $url }) {
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
`;

export default Post;
```

## Replace conflicting Keys

Some of the returned keys may be transformed, if they conflict with restricted keys used for GraphQL such as the following `['id', 'children', 'parent', 'fields', 'internal']`. These conflicting keys will now show up as `[key]_normalized`. (Thanks to [gatsby-source-apiserver](https://github.com/thinhle-agilityio/gatsby-source-apiserver))

## Contributing

Every contribution is very much appreciated.
Feel free to file bugs, feature- and pull-requests.

❤️ If this plugin is helpful for you, star it on [GitHub](https://github.com/AndreasFaust/gatsby-source-custom-api).
