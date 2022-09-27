import { useState } from 'react';
import Nina from '@nina-protocol/js-sdk';
import EmbedPlayer from '../../../components/EmbedPlayer';

const HubEmbed = (props) => {
  const { hub, hubReleases } = props;
  const [mouseOver, setMouseOver] = useState(false);

  hubReleases?.sort((a, b) => {
    return new Date(b.accountData.hubContent.datetime) - new Date(a.accountData.hubContent.datetime);
  })

  const handleMouseEnter = () => {
    setMouseOver(true);
  }

  const handleMouseLeave = () => {
    setMouseOver(false);
  }

  return (
    <div className='relative flex flex-col w-full h-full overflow-hidden'
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
    >
      <EmbedPlayer 
        metadata={hubReleases || []} 
        mouseOver={mouseOver} 
        hub={hub}
        />
    </div>
  )
}

export default HubEmbed;

export const getStaticPaths = async () => {
  return {
    paths: [
      {
        params: {
          hubHandle: 'placeholder',
        }
      }
    ],
    fallback: 'blocking'
  }
}

export const getStaticProps = async (context) => {
  const hubHandle = context.params.hubHandle
  await Nina.client.init(process.env.NINA_API_ENDPOINT, process.env.SOLANA_CLUSTER_URL, process.env.NINA_PROGRAM_ID);

  try {
    const hubData = await Nina.Hub.fetch(hubHandle, true)
    return {
      props: {
        hub: hubData.hub || null,
        hubReleases: hubData.releases || null,
        hubHandle,
      },
      revalidate: 10
    }
  } catch (error) {
    console.warn(error);
  }
  return {props: {}}
}
