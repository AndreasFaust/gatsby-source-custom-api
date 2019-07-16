import React from 'react'
import { graphql, Link } from 'gatsby'

import Layout from '../components/layout'
import SEO from '../components/seo'
import Img from 'gatsby-image'

const Work = ({ work }) => {
  console.log(work)
  return work.filter(w => w.type === 'image' && w.url).map(image => (
    <Img key={image.id} fluid={image.local.childImageSharp.fluid} />
  ))
}

const IndexPage = ({ data }) => {
  const works = data.allWorks.nodes
  console.log(data)
  return (
    <Layout>
      <SEO title='Home' keywords={[`gatsby`, `application`, `react`]} />
      <h1>Hi people</h1>
      <p>Welcome to your new Gatsby site.</p>
      <p>Now go build something great.</p>
      {/* {teasers.map(t => (
        <Images images={t.contentWork} />
      ))} */}
      {works.map(work => (
        <Work key={work.id} work={work} />
      ))}
      <Link to='/page-2/'>Go to page 2</Link>
    </Layout >
  )
}

export const query = graphql`
{
  allWorks {
    nodes {
      url
      text
      title
      description
      image {
        url
        modified
      }
    }
  }
}
`

export default IndexPage
