import { useState } from 'react';
import Nina from '@nina-protocol/nina-sdk';
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
    <div 
      className='relative flex flex-col w-full h-full overflow-hidden'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <EmbedPlayer metadata={[metadata]} mouseOver={mouseOver} hub={hub} hubReleasePubkey={hubReleasePubkey} />
    </div>
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
