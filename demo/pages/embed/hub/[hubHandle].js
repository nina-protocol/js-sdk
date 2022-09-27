import { useState } from 'react';
import Nina from '@nina-protocol/js-sdk';
import EmbedPlayer from '../../../components/EmbedPlayer';
import Head
 from 'next/head';
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
    <>
    <Head>
      <title>{hub?.data.displayName}</title>
      <meta
        name="description"
        content={`${hub?.data.description} \n Powered by Nina.`}
      />
      <meta name="og:type" content="website" />
      <meta
        name="og:title"
        content={`${hub?.data.displayName}"`}
      />
      <meta
        name="og:description"
        content={`${hub?.data.description} \nPowered by Nina.`}
      />
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@ninaprotocol" />
      <meta name="twitter:creator" content="@ninaprotocol" />
      <meta name="twitter:image:type" content="image/jpg" />
      <meta name="twitter:player" content={`https://dev.ninaprotocol.com/embed/hub/${hub?.handle}`} />
      <meta
        name="twitter:title"
        content={`${hub?.data.displayName}`}
      />
      <meta name="twitter:description" content={`${hub?.data.description} \n  Powered by Nina.`} />
      <meta name="twitter:player:width" content={450} />
      <meta name="twitter:player:height" content={450} />
      <meta name="twitter:image" content={hub?.data.image} />
      <meta name="og:image" content={hub?.data.image} />
    </Head>
    <div className='relative flex flex-col w-full h-full overflow-hidden'
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
    >
      <EmbedPlayer 
        metadata={hubReleases || []} 
        mouseOver={mouseOver} 
        hub={hub}
        />
    </div>
    </>
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
