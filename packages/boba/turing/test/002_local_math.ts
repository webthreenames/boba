import { BigNumber, Contract, ContractFactory, providers, Wallet, utils } from 'ethers'
import { ethers } from 'hardhat'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)
const abiDecoder = require('web3-eth-abi')
import * as request from 'request-promise-native'

const fetch = require('node-fetch')
import hre from 'hardhat'
const cfg = hre.network.config
const hPort = 1235 // Port for local HTTP server
var urlStr
import { getContractFactory } from '@eth-optimism/contracts'
const gasOverride =  {
  gasLimit: 3000000 //3,000,000
}

import HelloTuringJson from "../artifacts/contracts/HelloTuring.sol/HelloTuring.json"
import TuringHelper from "../artifacts/contracts/TuringHelper.sol/TuringHelper.json"
import L2GovernanceERC20Json from '@boba/contracts/artifacts/contracts/standards/L2GovernanceERC20.sol/L2GovernanceERC20.json'

let Factory__Hello: ContractFactory
let hello: Contract
let Factory__Helper: ContractFactory
let helper: Contract
let turingCredit: Contract
let L2BOBAToken: Contract
let addressesBOBA
const local_provider = new providers.JsonRpcProvider(cfg['url'])
var BOBAL2Address
var BobaTuringCreditAddress

// Key for autofunded L2 Hardhat test account
const testPrivateKey = '0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1'
const testWallet = new Wallet(testPrivateKey, local_provider)
const deployerPK = hre.network.config.accounts[0]
const deployerWallet = new Wallet(deployerPK, local_provider)

if (hre.network.name === "boba_local") {
  describe("Basic Math", function () {

      before(async () => {

      var http = require('http')
      var ip = require("ip")

      var server = module.exports = http.createServer(async function (req, res) {

        if (req.headers['content-type'] === 'application/json') {

          var body = '';

          req.on('data', function (chunk) {
            body += chunk.toString()
          })

          req.on('end', async function () {

            // there are two hacks in here to deal with ABI encoder/decoder issues
            // in the real world it's less complicated

            var jBody = JSON.parse(body)

            let v1 = jBody.params[0]

            if(v1.length > 194) {
              //chop off the prefix introduced by the real call
              v1 = '0x' + v1.slice(66)
            }

            const args = abiDecoder.decodeParameter('string', v1)

            let volume = (4/3) * 3.14159 * Math.pow(parseFloat(args['0']),3)

            res.writeHead(200, { 'Content-Type': 'application/json' });
            console.log("      (HTTP) SPHERE Returning off-chain response:", args, "->", volume * 100)

            let result = abiDecoder.encodeParameters(['uint256','uint256'], [32, Math.round(volume*100)])

            var jResp2 = {
              "jsonrpc": "2.0",
              "id": jBody.id,
              "result": result
            }

            res.end(JSON.stringify(jResp2))
            server.emit('success', body)

          });

        } else {
          console.log("Other request:", req)
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('Expected content-type: application/json')
        }
      }).listen(hPort)

      // Get a non-localhost IP address of the local machine, as the target for the off-chain request
      urlStr = "http://" + ip.address() + ":" + hPort

      console.log("    Created local HTTP server at", urlStr)

      Factory__Helper = new ContractFactory(
        (TuringHelper.abi),
        (TuringHelper.bytecode),
        testWallet)

      // defines the URL that will be called by HelloTuring.sol
      helper = await Factory__Helper.deploy(gasOverride)
      console.log("    Helper contract deployed as", helper.address, "on", "L2")

      Factory__Hello = new ContractFactory(
        (HelloTuringJson.abi),
        (HelloTuringJson.bytecode),
        testWallet)

      hello = await Factory__Hello.deploy(helper.address, gasOverride)

      console.log("    Test contract deployed as", hello.address)

      const tr1 = await helper.addPermittedCaller(hello.address, gasOverride)
      const res1 = await tr1.wait()
      console.log("    addingPermittedCaller to TuringHelper", res1.events[0].data)

      const result = await request.get({ uri: 'http://127.0.0.1:8080/boba-addr.json' })
      addressesBOBA = JSON.parse(result)
      BOBAL2Address = addressesBOBA.TOKENS.BOBA.L2
      BobaTuringCreditAddress = addressesBOBA.BobaTuringCredit

      L2BOBAToken = new Contract(
        BOBAL2Address,
        L2GovernanceERC20Json.abi,
        deployerWallet
      )

      // prepare to register/fund your Turing Helper
      turingCredit = getContractFactory(
        'BobaTuringCredit',
        deployerWallet
      ).attach(BobaTuringCreditAddress)

    })

    it("should return the helper address", async () => {
      let helperAddress = await hello.helperAddr();
      expect(helperAddress).to.equal(helper.address)
    })

    it("test of local compute endpoint: should do basic math via direct server query", async () => {

      let abi_payload = abiDecoder.encodeParameter('string','2.123')

      let body = {
        params: [abi_payload],
      }

      fetch(urlStr, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      }).then(
        res => res.json()
      ).then(json => {
          let result = abiDecoder.decodeParameters(['uint256','uint256'], json.result)
          expect(Number(result[1])).to.equal(3351)
        }
      )
    })

    it('Should fund your Turing helper contract in turingCredit', async () => {

      const depositAmount = utils.parseEther('0.5')
      const preBalance = await turingCredit.prepaidBalance(helper.address)

      const bobaBalance = await L2BOBAToken.balanceOf(deployerWallet.address)
      console.log("    BOBA Balance in your account", bobaBalance.toString())

      const approveTx = await L2BOBAToken.approve(
        turingCredit.address,
        depositAmount
      )
      await approveTx.wait()

      const depositTx = await turingCredit.addBalanceTo(
        depositAmount,
        helper.address
      )
      await depositTx.wait()

      const postBalance = await turingCredit.prepaidBalance(
        helper.address
      )

      expect(postBalance).to.be.deep.eq(preBalance.add(depositAmount))
    })
    it("should support floating point volume of sphere", async () => {
      await hello.estimateGas.multFloatNumbers(urlStr, '2.123', gasOverride)
      let tr = await hello.multFloatNumbers(urlStr, '2.123', gasOverride)
      const res = await tr.wait()
      expect(res).to.be.ok

      const ev = res.events.find(e => e.event === "MultFloatNumbers")
      const result = parseInt(ev.data.slice(-64), 16) / 100
      expect(result.toFixed(5)).to.equal('33.51000')
    })

    it("should support floating point volume of sphere based on geth-cached result", async () => {
      await hello.estimateGas.multFloatNumbers(urlStr, '2.123', gasOverride)
      let tr = await hello.multFloatNumbers(urlStr, '2.123', gasOverride)
      const res = await tr.wait()
      expect(res).to.be.ok

      const rawData = res.events[0].data
      const result = parseInt(rawData.slice(-64), 16) / 100
      expect(result.toFixed(5)).to.equal('33.51000')
    })

    it("final balance", async () => {
      const postBalance =await turingCredit.prepaidBalance(
        helper.address
      )
      //expect(postBalance).to.equal( utils.parseEther('0.5'))
    })
  })
} else {
  console.log("These tests are only enabled for the boba_local network")
}

