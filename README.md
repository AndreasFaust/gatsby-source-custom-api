# Gatsby Source Custom API

**Gatsby Source Custom API** helps you sourcing data from any API and transform it into Gatsby nodes. Define keys you want to be transformed into image-nodes and use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

## Getting Started

1. Install the package with **npm** or **yarn**

   `npm install gatsby-source-custom-api`

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

## Images

`Gatsby Source Custom API` automatically downloads your image-files, so you can use them with **[Gatsby Image](https://www.gatsbyjs.org/packages/gatsby-image/)**.

#### How does it recognize images?

The default key for images is `image`. You can also define your own image keys with the option `imageKeys`. Images have to be objects containing a childkey called `url`, which is a string that defines the path to an image file. Gatsby-Images are added as childkey `local`.

#### What about Caching?

If your image object provides a key called `modified`, this key gets cached and compared every time you build or develop. If it stays the same, the already downloaded version of the image-file is used.

## Transform Nodes to Pages

This is an example of how you use the required nodes to automatically generate pages: Insert the following code into the file `gatsby-node.js`. The sample key here is an array called `posts`. All array-elements can be required in GraphQl via `allPosts`. In this example the posts have a child-key called "url", which defines their path and serves as marker to find them in your matching React-component (`pages/post.js`).

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
          url: node.url,
        },
      })
    })
  )
}
```

In your `pages/post.js` you can require the data like so:

```javascript
import React from 'react'
import { graphql } from 'gatsby'

const Post = ({ data }) => {
  return <h1>{data.posts.title}</h1>
}

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
`

export default Post
```

## ProcessWire

This source-plugin was originally developed to use the amazing Open-Source-CMS **[ProcessWire](https://www.processwire.com/)** as a source for Gatsby. This simply can be achieved with this `home`-template:

```php
<?php namespace ProcessWire;
require_once ("buildPosts.php");
header('Content-Type: application/json');

if ($page->name === "home") {
  $posts = $pages->find("template=post");
  return json_encode([
      "posts" => buildPosts($posts),
  ]);
}
```

This could be the required file `buildPosts.php`:

```php
<?php namespace ProcessWire;

function buildPosts($posts) {
    $return = [];
    foreach ($posts as $post) {
        $return[] = [
          "url" => $post->url,
          "title" => $post->title,
          "image" => [
            "url" => $post->image->httpUrl,
            "description" => $post->image->description,
          ],
        ];
    }
    return $return;
}
```

Additionally, I developed a **ProcessWire-Module, to trigger Gatsby-builds from the backend.** I’ve planned to publish this module open-source in the near future, but it needs some more work, to make it universally deployable.

## Contributing

Every contribution is very much appreciated.
Feel free to file bugs, feature- and pull-requests.

**If this plugin is helpful for you, star it on [GitHub](https://github.com/AndreasFaust/gatsby-source-custom-api).**
