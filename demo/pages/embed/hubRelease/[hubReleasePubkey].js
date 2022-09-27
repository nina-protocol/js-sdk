import { useState } from 'react';
import Nina from '@nina-protocol/js-sdk';
import EmbedPlayer from '../../../components/EmbedPlayer';
import * as anchor from '@project-serum/anchor';

const HubReleaseEmbed = (props) => {
  const { metadata, hub, hubReleasePubkey } = props;
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
        <title>{`${metadata?.properties.artist} - "${metadata?.properties.title}"`}</title>
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
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}": ${metadata?.description} \n Published on ${hub?.data.displayName} \nPowered by Nina.`}
        />
      <meta name="twitter:card" content="player" />
        <meta name="twitter:site" content="@ninaprotocol" />
        <meta name="twitter:creator" content="@ninaprotocol" />
        <meta name="twitter:image:type" content="image/jpg" />
        <meta name="twitter:player" content={`https://dev.ninaprotocol.com/embed/hubRelease/${hubReleasePubkey}`} />
        <meta
          name="twitter:title"
          content={`${metadata?.properties.artist} - "${metadata?.properties.title}" on ${hub?.data.displayName}`}
        />
        <meta name="twitter:description" content={metadata?.description} />

        <meta name="twitter:image" content={metadata?.image} />
        <meta name="og:image" content={metadata?.image} />
      </Head>
      <div 
        className='relative flex flex-col w-full h-full overflow-hidden'
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <EmbedPlayer metadata={[metadata]} mouseOver={mouseOver} hub={hub} hubReleasePubkey={hubReleasePubkey} />
      </div>
    </>
  )
}

export default HubReleaseEmbed;

export const getStaticPaths = async () => {
  return {
    paths: [
      {
        params: {
          hubReleasePubkey: 'placeholder',
        }
      }
    ],
    fallback: 'blocking'
  }
}

export const getStaticProps = async (context) => {
  const hubReleasePubkey = context.params.hubReleasePubkey
  await Nina.client.init(process.env.NINA_API_ENDPOINT, process.env.SOLANA_CLUSTER_URL, process.env.NINA_PROGRAM_ID);
  
  try {
    const hubRelease = await Nina.client.program.account.hubRelease.fetch(new anchor.web3.PublicKey(hubReleasePubkey))
    const { hub, release } = await Nina.Hub.fetchHubRelease(hubRelease.hub.toBase58(), context.params.hubReleasePubkey);
    return {
      props: {
        metadata: release.metadata || null,
        hub,
        hubReleasePubkey,
      },
      revalidate: 10
    }
  } catch (error) {
    console.warn(error);
  }
  return {props: {}}
}
