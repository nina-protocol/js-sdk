import { useState } from 'react';
import Nina from '@nina-protocol/js-sdk';
import EmbedPlayer from '../../../components/EmbedPlayer';
import Head from 'next/head';

const ReleaseEmbed = (props) => {
  const { metadata, releasePubkey } = props;
  const [mouseOver, setMouseOver] = useState(false);

  const handleMouseEnter = () => {
    setMouseOver(true);
  }

  const handleMouseLeave = () => {
    setMouseOver(false);
  }  

  return (
    <>
      <Head>
        <meta
          name="description"
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}": ${metadata?.description} \n  Powered by Nina.`}
        />
        <meta name="og:type" content="website" />
        <meta
          name="og:title"
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}"`}
        />
        <meta
          name="og:description"
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}": ${metadata?.description} \nPowered by Nina.`}
        />
      <meta name="twitter:card" content="player" />
        <meta name="twitter:site" content="@ninaprotocol" />
        <meta name="twitter:creator" content="@ninaprotocol" />
        <meta name="twitter:image:type" content="image/jpg" />
        <meta name="twitter:player" content={`https://dev.ninaprotocol.com/embed/release/${releasePubkey}`} />
        <meta
          name="twitter:title"
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}"`}
        />
        <meta name="twitter:description" content={metadata?.description} />

        <meta name="twitter:image" content={metadata?.image} />
        <meta name="og:image" content={metadata?.image} />
        <meta name="twitter:player:width" content={450} />
        <meta name="twitter:player:height" content={450} />
      </Head>
      <div 
        className='relative flex flex-col w-full h-full overflow-hidden'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        >
        <EmbedPlayer metadata={[metadata]} mouseOver={mouseOver} />
      </div>
    </>
  )
}

export default ReleaseEmbed;

export const getStaticPaths = async () => {
  return {
    paths: [
      {
        params: {
          releasePubkey: 'placeholder',
          hubHandle: 'placeholder'
        }
      }
    ],
    fallback: 'blocking'
  }
}

export const getStaticProps = async (context) => {
  const releasePubkey = context.params.releasePubkey
  await Nina.client.init(process.env.NINA_API_ENDPOINT, process.env.SOLANA_CLUSTER_URL, process.env.NINA_PROGRAM_ID);

  try {
    const { release } = await Nina.Release.fetch(releasePubkey, false)
    return {
      props: {
        metadata: release.metadata || null,
        releasePubkey,
      },
      revalidate: 10
    }
  } catch (error) {
    console.warn(error);
  }
  return {props: {}}
}
