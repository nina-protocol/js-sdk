import { useState } from 'react';
import Nina from '@nina-protocol/js-sdk';
import EmbedPlayer from '../../../components/EmbedPlayer';

const ReleaseEmbed = (props) => {
  const { metadata } = props;
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
      <EmbedPlayer metadata={[metadata]} mouseOver={mouseOver} />
    </div>
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
      },
      revalidate: 10
    }
  } catch (error) {
    console.warn(error);
  }
  return {props: {}}
}
