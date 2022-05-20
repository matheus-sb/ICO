import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import styles from '../styles/Home.module.css'
import Web3Modal from "web3modal";
import { BigNumber, Contract, providers, utils } from 'ethers';
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_ADDRESS } from '../constants';

export default function Home() {

  const zero = BigNumber.from(0);
  
  const [walletConnected, setWalletConnected] = useState(false);

  const [tokensMinted, setTokensMinted] = useState(zero);

  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);

  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);

  const [tokenAmount, setTokenAmount] = useState(zero);

  const [loading, setLoading] = useState(false);

  const web3ModalRef = useRef();

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();

    const web3Provider = new providers.Web3Provider(provider);
    
    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    return needSigner ? web3Provider.getSigner() : web3Provider;
  }

  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      const provider = await getProviderOrSigner();
      setWalletConnected(true);
  
      return provider; 
    } catch (error) {
      console.log(error);
    }
  }

  const checkIfThereIsProviderOrSigner = (provider) => {
    if (!provider) {
      throw new Error("Provider or Signer is missing!");
    }
  }

  const getTotalTokensMinted = async (provider) => {
    try {
      checkIfThereIsProviderOrSigner(provider);

      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
  
      const _tokensMinted = await tokenContract.totalSupply();
  
      setTokensMinted(_tokensMinted);
    } catch (error) {
      console.error(error);
    }
  }

  const getBalanceOfCryptoDevTokens = async (provider, signer) => {
    try {
      checkIfThereIsProviderOrSigner(provider);
      checkIfThereIsProviderOrSigner(signer);

      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
  
      const address = await signer.getAddress();
      const balance = await tokenContract.balanceOf(address);

      setBalanceOfCryptoDevTokens(balance);
    } catch (error) {
      console.error(error);
    }
  }

  const getTokensToBeClaimed = async (provider, signer) => {
    try {
      checkIfThereIsProviderOrSigner(provider);
      checkIfThereIsProviderOrSigner(signer);

      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // Get the address associated to the signer which is connected to  MetaMask
      const address = await signer.getAddress();
      // call the balanceOf from the NFT contract to get the number of NFT's held by the user
      const balance = await nftContract.balanceOf(address);
      // balance is a Big number and thus we would compare it with Big number `zero`
      if (balance === zero) {
        setTokensToBeClaimed(zero);
        return;
      }

      // amount keeps track of the number of unclaimed tokens
      var amount = 0;
      // For all the NFT's, check if the tokens have already been claimed
      // Only increase the amount if the tokens have not been claimed
      // for a an NFT(for a given tokenId)
      for (var i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
        const claimed = await tokenContract.tokenIdsClaimed(tokenId);
        if (!claimed) {
          amount++;
        }
      }
      //tokensToBeClaimed has been initialized to a Big Number, thus we would convert amount
      // to a big number and then set its value
      setTokensToBeClaimed(BigNumber.from(amount));
    } catch (error) {
      console.error(error);
    }
  }

  const getTokensDetails = async (provider) => {
    const _provider = provider ? provider : await getProviderOrSigner();

    getTotalTokensMinted(_provider);

    const signer = await getProviderOrSigner(true);

    getBalanceOfCryptoDevTokens(_provider, signer);
    getTokensToBeClaimed(_provider, signer);
  }

  /**
   * mintCryptoDevToken: mints `amount` number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // Each token is of `0.001 ether`. The value we need to send is `0.001 * amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // value signifies the cost of one crypto dev token which is "0.001" eth.
        // We are parsing `0.001` string to ether using the utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully minted Crypto Dev Tokens");
      getTokensDetails();
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
   */
  const claimCryptoDevTokens = async () => {
    try {
      // We need a Signer here since this is a 'write' transaction.
      // Create an instance of tokenContract
      const signer = await getProviderOrSigner(true);
      // Create an instance of tokenContract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      const tx = await tokenContract.claim();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("Sucessfully claimed Crypto Dev Tokens");
      getTokensDetails();
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    if (walletConnected) {
      return;
    }

    web3ModalRef.current = new Web3Modal({
      network: "rinkeby",
      providerOptions: {},
      disableInjectedProvider: false
    });

    const init = async () => {
        const provider = await connectWallet();
        getTokensDetails();
    }

    init();
  }, [walletConnected]);

  /**
  * renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // If tokens to be claimed are greater than 0, Return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };
  
  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
