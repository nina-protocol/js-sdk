import { useEffect } from 'react';
import Head from 'next/head'
import ApiExplorer from '../components/ApiExplorer';
import EmbedExplorer from '../components/EmbedExplorer';
import Info from '../components/Info';
import Nina from '@nina-protocol/js-sdk';

import { Link } from 'react-scroll'

export default function Home() {

  useEffect(() => {
    Nina.client.init(process.env.NINA_API_ENDPOINT, process.env.SOLANA_CLUSTER_URL, process.env.NINA_PROGRAM_ID);
  }, [])

  return (
    <div className='font-helvetica main' >
      <Head>
        <title>Nina Dev</title>
        <meta name="description" content="Nina Dev" />

        <link rel="icon" href="/images/favicon.ico" />
      </Head>

      <main className='h-full px-4 pt-4 max-w-[1400px] m-auto sm:px-8' >
        <h1 className='text-l font-bold'>
          NINA DEV
        </h1>

        <div className='flex flex-col items-start flex-grow w-full min-h-screen font-mono'>
          <p className='mb-40'>a collection of resources and open-source tools for building on the <Link className='link' href="https://ninaprotocol.com" target='_blank' rel="noopener noreferrer">Nina Protocol</Link> - a digitally-native music ecosystem.</p>
          <p>Tools:</p>
          <ul>
            <li>- <Link className='link' to='api_explorer' smooth={true} >Nina API Explorer</Link> [an interface to query the public <a className="link" href="https://github.com/nina-protocol/nina-indexer" target='_blank' rel="noopener noreferrer">Nina Protocol API</a>]</li>
            <li>- <Link className='link' to='release_embed' smooth={true} >Nina Embed</Link> [a code generator to embed Nina Hubs and Releases anywhere you can write HTML]</li>
            <li>- <Link className='link' to='info' smooth={true}>Built on Nina</Link> [a list of projects building on Nina]</li>
          </ul>
          <p className='mt-20'>Repos:</p>
          <ul>
            <li>- <a className='link' href='http://https://github.com/nina-protocol/nina' target='_blank' rel="noopener noreferrer">nina</a> [main repo powering <a href='https://ninaprotocol.com' className='link' target='_blank' rel="noopener noreferrer">ninaprotocol.com</a>, <a href='https://hubs.ninaprotocol.com' className='link' target='_blank' rel="noopener noreferrer">hubs.ninaprotocol.com</a>, <a href='https://radio.ninaprotocol.com' className='link' target='_blank' rel="noopener noreferrer">radio.ninaprotocol.com</a>, and the on-chain <a href='https://github.com/nina-protocol/nina/tree/main/programs/nina' className='link' target='_blank' rel="noopener noreferrer">Nina program</a>]</li>
            <li>- <a className='link' href='https://github.com/nina-protocol/nina-indexer' target='_blank' rel="noopener noreferrer">nina-indexer</a> [an indexer for ingesting on-chain data from the Nina Program - used by the public Nina API] (<a className='link' href='https://sdk.docs.ninaprotocol.com'>Docs</a>)</li>
            <li>- <a className='link' href='https://github.com/nina-protocol/js-sdk' target='_blank' rel="noopener noreferrer">js-sdk</a> [Javascript SDK for fetching data from the Nina API] (<a className="link" href="https://api.docs.ninaprotocol.com">Docs</a>)</li>
          </ul>
        </div>

        <ApiExplorer />
        <EmbedExplorer />
        <Info />
      </main>
    </div>
  )
}