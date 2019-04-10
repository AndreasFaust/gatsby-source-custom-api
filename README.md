![Logo of gatsby-source-custom-api](https://github.com/andreasfaust/gatsby-source-custom-api/raw/master/gatsby-source-custom-api-logo.png)

**gatsby-source-custom-api** helps you sourcing data from any API and transform it into Gatsby nodes. Define keys you want to be transformed into image-nodes and use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

## Getting Started

1. Install the package with **yarn** or **npm**

`yarn add gatsby-source-custom-api`

2. Add to plugins in your gatsby-config.js

```javascript
module.exports = {
    {
      resolve: 'gatsby-source-custom-api',
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

| **Name**  | **Type**         | **Description**                                                                                                                                                                                         |
| :-------- | :--------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| url       | object or string | `Required.` Url of your API as a string. If you have two different APIs for development and production, define an object with the keys `production` and `development`.                                  |
| rootKey   | string           | `Optional.` Name your API.                                                                                                                                                                              |
| imageKeys | array            | Define the keys of image objects. These must have a childkey called `url`, which is a string that defines the path to an image file. Gatsby-Images are added as childkey `local`. Default: `['image']`. |
| schemas   | object           | Define default-schemas for the objects of your API you explicitly want to require via GraphQL. See "Provide Default Schemas" for more information.                                                      |

## Images

`Gatsby Source Custom API` automatically downloads your image-files, so you can use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

#### How does it recognize images?

The default key for images is `image`. You can also define your own image keys with the option `imageKeys`. Images have to be objects containing a childkey called `url`, which is a string that defines the path to an image file. Gatsby-Images are added as childkey `local`.

#### What about Caching?

If your image object provides a key called `modified`, this key gets cached and compared every time you build or develop. If it stays the same, the already downloaded version of the image-file is used.

## Provide Default Schemas

You need to provide default schemas for the arrays and objects of your API to avoid GraphQl-errors.
Arrays may not stay empty and object do always need to include the same amount of keys, which need be of the same type.
You can provide default schemas via the prop `schemas`. It is an object, which keys are the default values.
Objects and Arrays stay empty and be better defined as default-schemas themselves.

```javascript
module.exports = {
    {
      resolve: 'gatsby-source-custom-api',
      options: {
        url: 'http://your-api.dev',
        schemas: {
            posts: {
                url: '',
                images: [],
                author: {}
            },
            images: {
                url: '',
                modified: 0,
            },
            author: {
                firstname: '',
                lastname: '',
            }
        }
      },
    },
}
```

### Dummy Nodes for empty Arrays, empty Objects and failing Images

If an array stays empty, `gatsby-source-custom-api` creates a dummy element to avoid errors, if you provide a schema for this array. It's the same with completely empty objects and failed images.
You certainly don't want to render those, so you need to filter them out:

```javascript
import React from "react";
import Img from "gatsby-image";
import { graphql } from "gatsby";

const PostImages = ({ images }) => {
    return images.filter(image => !image.dummy).map(image => (
        <Img key={image.id} fluid={image.local.childImageSharp.fluid} />
    ))
};

const Posts = ({ data }) => {
    const posts = data.allPosts.nodes.filter(post => !post.dummy);
    return posts.map(post => {
        return <PostImages key={post.id} images={post.images}
    });
};

export const query = graphql`
    {
        allPosts {
            nodes {
                url
                dummy
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
    }
`;

export default Posts;
```

> **Attention:** A dummy-image is downloaded from [placeholder.com](https://placeholder.com) to mimic a real file-node.
> This means, that this feature only works with a working internet-connection.
> Any suggestions for a better solution are very much appreciated.

### Replace conflicting Keys

Some of the returned keys may be transformed, if they conflict with restricted keys used for GraphQL such as the following ['id', 'children', 'parent', 'fields', 'internal']. These conflicting keys will now show up as `[key]_normalized`. (Thanks to [gatsby-source-apiserver](https://github.com/thinhle-agilityio/gatsby-source-apiserver))

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

## Contributing

Every contribution is very much appreciated.
Feel free to file bugs, feature- and pull-requests.

❤️ If this plugin is helpful for you, star it on [GitHub](https://github.com/AndreasFaust/gatsby-source-custom-api).
