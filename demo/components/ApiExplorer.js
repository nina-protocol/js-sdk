import dynamic from 'next/dynamic'
import {useState, useRef} from 'react';
const ReactJson = dynamic(() => import('react-json-view'), {ssr: false});
import Nina from '@nina-protocol/js-sdk';

const resourceOptions = {
  'Accounts': {
    modifiers: [
      '',
      'Collected',
      'Exchanges',
      'Hubs',
      'Posts',
      'Published',
      'Revenue Shares'
    ]
  },
  'Exchanges': {
    modifiers: [],
  },
  'Hubs': {
    modifiers: [
      '',
      'Collaborators',
      'Releases',
      'Posts'
    ]
  },
  'Posts': {
    modifiers: []
  },
  'Releases': {
    modifiers: [
      '',
      'Collectors',
      'Exchanges',
      'Hubs',
      'Revenue Share Recipients'
    ]
  },
  'Search': {
    modifiers: []
  }
}
const ApiExplorer = () => {
  const [resource, setResource] = useState(undefined);
  const [modifier, setModifier] = useState(undefined);
  const [publicKey, setPublicKey] = useState(undefined);
  const [response, setResponse] = useState(undefined);
  const [withAccountData, setWithAccountData] = useState(false);
  const withAccountDataRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`${resource} ${modifier} ${publicKey}`);
    if (resource === 'Accounts') {
      if (modifier === 'Collected') {
        Nina.Account.fetchCollection(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Hubs') {
        Nina.Account.fetchHubs(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Posts') {
        Nina.Account.fetchPosts(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Published') {
        Nina.Account.fetchPublished(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Exchanges') {
        Nina.Account.fetchExchanges(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Revenue Shares') {
        Nina.Account.fetchRevenueShares(publicKey, withAccountData).then(setResponse);
      } else{
        if (publicKey && publicKey.length > 0) {
          Nina.Account.fetch(publicKey, withAccountData).then(setResponse);
        } else {
          Nina.Account.fetchAll({}).then(setResponse);
        }
      }
    } else if (resource === 'Exchanges') {
      if (publicKey && publicKey.length > 0) {
        Nina.Exchange.fetch(publicKey, withAccountData).then(setResponse);
      } else {
        Nina.Exchange.fetchAll({}, withAccountData).then(setResponse);
      }
    } else if (resource === 'Hubs') {
      if (modifier === 'Collaborators') {
        Nina.Hub.fetchCollaborators(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Releases') {
        Nina.Hub.fetchReleases(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Posts') {
        Nina.Hub.fetchPosts(publicKey, withAccountData).then(setResponse);
      } else {
        if (publicKey && publicKey.length > 0) {
          Nina.Hub.fetch(publicKey, withAccountData).then(setResponse);
        } else {
          Nina.Hub.fetchAll({}, withAccountData).then(setResponse);
        }
      }
    } else if (resource === 'Posts') {
      if (publicKey && publicKey.length > 0) {
        Nina.Post.fetch(publicKey, withAccountData).then(setResponse);
      } else {
        Nina.Post.fetchAll({}, withAccountData).then(setResponse);
      }
    } else if (resource === 'Releases') {
      if (modifier === 'Collectors') {
        Nina.Release.fetchCollectors(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Exchanges') {
        Nina.Release.fetchExchanges(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Hubs') {
        Nina.Release.fetchHubs(publicKey, withAccountData).then(setResponse);
      } else if (modifier === 'Revenue Share Recipients') {
        Nina.Release.fetchRevenueShareRecipients(publicKey, withAccountData).then(setResponse);
      } else {
        if (publicKey && publicKey.length > 0) {
          Nina.Release.fetch(publicKey, withAccountData).then(setResponse);
        } else {
          Nina.Release.fetchAll({}, withAccountData).then(setResponse);
        }
      }
    } else if (resource === 'Search') {
      Nina.Search.withQuery(publicKey, withAccountData).then(setResponse);
    }
  }
  const handleReset = (e) => {
    e.preventDefault();
    setResource(undefined);
    setModifier(undefined);
    setPublicKey('');
    setResponse(undefined);
  }

  return (
    <div name='api_explorer' id="#api_explorer" className='flex flex-col flex-grow h-screen font-mono mt-10'>
      <h2 className='mt-2 text-2xl underline uppercase'>Nina API Explorer</h2> 
      <div className='flex items-end mt-2'>
        <a className='link' target='_blank' rel="noreferrer"  href='https://nina-protocol.github.io/nina-indexer/'>Docs</a>
        <a className='ml-2 link' target='_blank' rel="noreferrer" href='https://github.com/nina-protocol/nina-indexer'>
          Github
        </a>
      </div>
        <ul>
          <p className='mt-2'>- Select a Resource and click Fetch to retrieve data from the API. Provide a publicKey or modifier to retrieve specific data.</p>
          <p className='mt-2'>- `With Account Data` returns full formatted on-chain account data.</p>
        </ul>

        <div className='w-full mt-2'>
          <form className='pt-2 text-xl'>
            <div className='flex justify-between gap-4'>
              <select className='w-1/3 p-2 text-center capitalize border-2 select select-bordered'
                name="resource"
                id="resource"
                value={resource || 'Resource'}
                onChange={(e) => {
                  setPublicKey('');
                  setResource(e.target.value)
                }}>
                <option value="none" defaultValue hidden >Resource</option>
                {Object.keys(resourceOptions).map(resource => (
                  <option key={resource} value={resource}>{resource}</option>
                ))}
              </select>

              <input
                value={publicKey}
                disabled={!resource}
                className='w-1/3 p-2 text-center transition-all duration-200 border-2 input-bordered input '
                placeholder={resource !== 'Search' ? (resource === 'Hubs' ? 'publicKey or hubHandle' : 'publicKey') : 'query'}
                type="text"
                name="publicKey"
                id="publicKey"
                onChange={(e) => {
                  if (e.target.value.length === 0) {
                    setModifier(undefined)
                  }
                  if (e.target.value.indexOf('"') > -1) {
                    e.target.value = e.target.value.replace(/"/g, '')
                  }
                  setPublicKey(e.target.value)
                }} />

              <select className='w-1/3 p-2 text-center capitalize transition-all duration-200 border-2 select select-bordered '
                name="modifier"
                id="modifier"
                disabled={!publicKey || publicKey.length === 0 || resource === 'search'}
                value={modifier || 'Modifier'}
                onChange={(e) => {
                  setModifier(e.target.value)
                }}>
                <option value="none" defaultValue hidden>Modifier</option>
                {resourceOptions[resource]?.modifiers.map(modifier => (
                  <option key={modifier} value={modifier} >{modifier}</option>
                ))}
              </select>
            </div>

            <div className='flex flex-col items-center justify-between gap-4 mt-4 sm:gap-8 sm:flex-row align-center'>
              <button className='w-full sm:w-[calc(66.666667%-1rem)] p-2 transition-all duration-200 border-2 w-5/8 btn-outline btn capitalize' type="submit"
                disabled={!resource}
                onClick={(e) => handleSubmit(e)}>
                {!resource && 'Select a Resource to explore our API'}
                {resource && 'Fetch'}
              </button>

              <div className='w-full sm:w-1/3'>
                <div className='flex justify-end'>
                  <div className="flex items-center px-2 ml-4 ">
                    <input id="withAccountData" className='checkbox' type="checkbox" value=""
                      disabled={!resource || resource === 'search'}
                      ref={withAccountDataRef}
                      onChange={(e) => {
                        setWithAccountData(e.target.checked)
                      }
                      }
                    />
                    <label htmlFor="withAccountData" className={`ml-2 text-sm ${!resource === true ? 'text-slate-700' : ''} `}>With Account Data</label>
                  </div>

          
                  <button className={`py-2 ml-2 btn ${!resource == true || resource === 'resource' ? 'btn-disabled' : 'btn-outlined-default'} `}
                    disabled={!resource}
                    onClick={e => handleReset(e)}
                  >
                    Reset
                  </button>
                </div>
              </div>

            </div>
          </form>
        </div>


        <div className='min-h-[400px] h-full mt-4 overflow-y-auto overflow-x-hidden border-2 mb-4'>
          <ReactJson src={response} theme='ashes' style={{padding: '8px', minHeight: '100%'}} />
        </div>
    </div>
  )
}

export default ApiExplorer;
