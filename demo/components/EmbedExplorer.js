import React, {useEffect, useState} from "react";
import Iframe from "react-iframe";
import {CopyToClipboard} from 'react-copy-to-clipboard';
import SyntaxHighlighter from 'react-syntax-highlighter';
import {
  a11yDark
} from 'react-syntax-highlighter/dist/cjs/styles/hljs';


const EmbedExplorer = () => {
  const [baseUrl, setBaseUrl] = useState();
  const [releasePublicKey, setReleasePublicKey] = useState('4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ');
  const [hubReleasePublicKey, setHubReleasePublicKey] = useState();
  const [hubHandle, setHubHandle] = useState();
  const [example, setExample] = useState('')
  const [isHubUrl, setIsHubUrl] = useState(false)
  const [iframeCopiedText, setIframeCopiedText] = useState('Copy Iframe Code')
  const [embedCopiedText, setEmbedCopiedText] = useState('Copy Embed Code')
  const [embedCode, setEmbedCode] = useState('')
  const [iframeCode, setIframeCode] = useState('')
  useEffect(() => {
    if (window !== undefined && !baseUrl) {
      setBaseUrl(window.location.origin + '/embed')
    }
  }, [])

  useEffect(() => {
    setIframeCode(`<iframe src="${!isHubUrl ? `${baseUrl}/${hubHandle ? `hubRelease` : 'release'}/${releasePublicKey}` : `${baseUrl}/hub/${hubHandle}`}" width="450px" height="450px" frameborder="0" />`)
    setEmbedCode(`${!isHubUrl ? `${baseUrl}/${hubHandle ? `hubRelease` : 'release'}/${releasePublicKey}` : `${baseUrl}/hub/${hubHandle}`}`)
  }, [isHubUrl, baseUrl, releasePublicKey, hubHandle])

  const handleChange = async (str) => {
    setExample(str)
    if (str === 0) {
      setReleasePublicKey(undefined)
    }

    //removes quotes from string   
    if (str.indexOf('"') > -1) {
      str = str.replace(/"/g, '')
    }

    if (isUrl(str) && str.indexOf('hubs.ninaprotocol.com') > -1 && str.indexOf('releases') > -1) {
      //HUB RElEASE URL;
      const hubReleasePublicKey = str.split('/').pop();
      const hubHandle = str.split('/').slice(-3)[0];
      setHubReleasePublicKey(hubReleasePublicKey)
      setReleasePublicKey(hubReleasePublicKey);

      setHubHandle(hubHandle)
      setIsHubUrl(false)
      return
    }

    if (isUrl(str) && str.indexOf('hubs.ninaprotocol.com') > -1 && str.indexOf('releases') === -1) {
      //HUB URL;
      setIsHubUrl(true)
      const hubHandle = str.split('/').pop();
      setHubHandle(hubHandle)
      return
    }

    if (isUrl(str) && str.indexOf('hubs.ninaprotocol.com') === -1) {
      //Non-hub URL;
      setIsHubUrl(false)
      setHubHandle(null)

      setReleasePublicKey(str.split('/').pop())
      return
    }
  }

  const handleCopyAlert = (isEmbed) => {
    if (isEmbed) {
      setEmbedCopiedText('Copied to Clipboard!')
      setTimeout(() => {
        setEmbedCopiedText('Copy Embed Code')
      }, 2000)
    } else {
      setIframeCopiedText('Copied to Clipboard!')
      setTimeout(() => {
        setIframeCopiedText('Copy Iframe Code')
      }, 2000)
    }
  }

  const isUrl = (s) => {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(s);
  }

  const embedTypes = [
    {
      type: 'Release',
      value: 'https://www.ninaprotocol.com/4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ'
    }, 
    {
      type: 'Hub',
      value: 'https://hubs.ninaprotocol.com/joanna7459'
    },
    {
      type: 'Hub Release',
      value: 'https://hubs.ninaprotocol.com/deleted/releases/3WkcZetP4jomraouPmTbNiPWE8MReYH3ReFpGSxjayy6'
    },
  ]

  return (
    <div name='release_embed' id="embed" className='py-4 mt-10 m-h-screen' >
      <h2 className='mt-2 text-2xl underline uppercase'>Nina Embed</h2>
      <div className="grid grid-cols-1 mt-2 sm:grid-cols-2">
        <div className="">
          <div className="flex w-full p-10 mt-4 break-words whitespace-normal border-2 sm:w-3/4 card bg-base-200">
            <p className="pb-4">Enter a link to a Release or Hub to generate an embed code.</p>
            <div className="form-control">
              <label className="hidden pb-4 form-label">
                <span className="text-base">Nina Embed</span>
              </label>
              <input type="text" placeholder="https://www.ninaprotocol.com/4dS4v5dGrUwEZmjCFu56qgyAmRfaPmns9PveWAw61rEQ" value={example} className="input" onChange={e => handleChange(e.target.value)}></input>
            </div>
            <p className="mt-4">Examples:</p>
            <ul>
              {embedTypes.map((embed, i) => (<li key={i}>- <a className="link" onClick={(e) => handleChange(embed.value)}>{embed.type}</a></li>))}
            </ul>
          </div>
          
          {baseUrl && (
            <div className="relative w-full p-10 mt-4 text-left whitespace-pre-line border-2 sm:w-3/4 card bg-base-200">
              <SyntaxHighlighter language="javascript" className="html" wrapLongLines={true} style={a11yDark} customStyle={{padding: '16px'}} >
                  {iframeCode}
              </SyntaxHighlighter>

              <CopyToClipboard text={iframeCode}
                onCopy={() => handleCopyAlert(false)}
              >
                <button className="mt-4 capitalize top-2 right-2 btn">{iframeCopiedText}</button>
              </CopyToClipboard>
              <CopyToClipboard text={embedCode}
                onCopy={() => handleCopyAlert(true)}
              >
                <button className="mt-4 capitalize top-2 right-2 btn">{embedCopiedText}</button>
              </CopyToClipboard>
            </div>
          )}
        </div>
        {baseUrl && (
          <div className="flex justify-center mt-4 sm:mt-20">
            <Iframe 
              url={!isHubUrl ? `${baseUrl}/${hubHandle ? `hubRelease/${hubReleasePublicKey}` : `/release/${releasePublicKey}`}` : `${baseUrl}/hub/${hubHandle}`}
              className="border-2 h-[340px] w-[340px] sm:h-[450px] sm:w-[450px]"
              display="initial"
              position="relative"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default EmbedExplorer;