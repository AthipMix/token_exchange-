"use client";

import React, { useState, useEffect } from "react";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Chip,
  Stack,
  Container,
  Card,
  CardContent,
  TextField,
  Box,
  IconButton,
  Divider,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";

import { initializeConnector } from "@web3-react/core";
import { MetaMask } from "@web3-react/metamask";

import { ethers } from "ethers";
import { formatEther, parseUnits } from "@ethersproject/units";

import abi from "./abi.json";

const [metaMask, hooks] = initializeConnector(
  (actions) => new MetaMask({ actions })
);

const { useChainId, useAccounts, useIsActive, useProvider } = hooks;

const contractChain = 11155111;

// Sepolia contract address
const contractAddress = "0x52aFD939A3B6BD8a2226B65fA16B3f9F14DAB4f1";

const getAddressTxt = (str, s = 6, e = 6) => {
  if (str) {
    return `${str.slice(0, s)}...${str.slice(str.length - e)}`;
  }

  return "";
};

export default function Page() {
  const chainId = useChainId();
  const accounts = useAccounts();
  const isActive = useIsActive();
  const provider = useProvider();

  const [balance, setBalance] = useState("");
  const [ETHValue, setETHValue] = useState("");

  /*
   * อ่าน Token Balance
   */
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!provider || !accounts?.[0]) {
          return;
        }

        const signer = provider.getSigner();

        const smartContract = new ethers.Contract(
          contractAddress,
          abi,
          signer
        );

        const myBalance = await smartContract.balanceOf(accounts[0]);

        console.log("Token balance:", formatEther(myBalance));

        setBalance(formatEther(myBalance));
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      }
    };

    if (isActive && accounts?.[0]) {
      fetchBalance();
    }
  }, [isActive, accounts, provider]);

  /*
   * Buy Token
   */
  const handleBuy = async () => {
    try {
      if (!provider || !accounts?.[0]) {
        alert("กรุณา Connect Wallet ก่อน");
        return;
      }

      if (Number(ETHValue) <= 0) {
        alert("กรุณาระบุจำนวน ETH");
        return;
      }

      const signer = provider.getSigner();

      const smartContract = new ethers.Contract(
        contractAddress,
        abi,
        signer
      );

      const weiValue = parseUnits(ETHValue.toString(), "ether");

      const tx = await smartContract.buy({
        value: weiValue.toString(),
      });

      console.log("Transaction hash:", tx.hash);

      alert("Transaction ส่งเรียบร้อย");

      await tx.wait();

      alert("Transaction สำเร็จ");

      location.reload();
      /*
       * Refresh balance หลังซื้อ
       */
      const myBalance = await smartContract.balanceOf(accounts[0]);

      setBalance(formatEther(myBalance));
    } catch (error) {
      console.error("Buy failed:", error);
      alert("Buy Token ไม่สำเร็จ");
    }
  };

  /*
   * เชื่อมต่อ Wallet เดิมอัตโนมัติ
   */
  useEffect(() => {
    const walletDisconnected =
      sessionStorage.getItem("walletDisconnected");

    if (walletDisconnected === "true") {
      return;
    }

    void metaMask.connectEagerly().catch(() => {
      console.debug("Failed to connect eagerly to MetaMask");
    });
  }, []);

  /*
   * Connect MetaMask
   */
  const handleConnect = async () => {
    try {
      if (!window.ethereum) {
        alert("ไม่พบ MetaMask");
        return;
      }

      /*
       * ลบสถานะ Disconnect
       */
      sessionStorage.removeItem("walletDisconnected");

      /*
       * ขอสิทธิ์เข้าถึง Account
       */
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {},
          },
        ],
      });

      /*
       * เชื่อมต่อ web3-react
       */
      await metaMask.activate(contractChain);
    } catch (error) {
      console.error("MetaMask connection failed:", error);

      if (error.code === 4001) {
        alert("ผู้ใช้ยกเลิกการเชื่อมต่อ MetaMask");
      } else {
        alert("ไม่สามารถเชื่อมต่อ MetaMask ได้");
      }
    }
  };

  /*
   * Disconnect Wallet
   */
  const handleDisconnect = async () => {
    /*
     * ป้องกันการ connect กลับอัตโนมัติ
     */
    sessionStorage.setItem("walletDisconnected", "true");

    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [
            {
              eth_accounts: {},
            },
          ],
        });
      }

      console.log("MetaMask permission revoked");
    } catch (error) {
      console.error(
        "Failed to revoke MetaMask permission:",
        error
      );
    } finally {
      /*
       * Reset web3-react
       */
      metaMask.resetState();

      /*
       * Reset UI
       */
      setBalance("");
      setETHValue("");

      alert("Disconnect Wallet สำเร็จ");
    }
  };

  return (
    <div>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="h6"
              component="div"
              sx={{ flexGrow: 1 }}
            >
              My Token App
            </Typography>

            {!isActive ? (
              <Button color="inherit" onClick={handleConnect}>
                Connect
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Chip
                  label={getAddressTxt(accounts?.[0])}
                  variant="outlined"
                  sx={{ color: "white" }}
                />

                <Button
                  color="inherit"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </Stack>
            )}
          </Toolbar>
        </AppBar>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 2 }}>
        {isActive ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography>
                  ATK Token
                </Typography>

                <TextField
                  label="Address"
                  value={getAddressTxt(accounts?.[0])}
                  InputProps={{
                    readOnly: true,
                  }}
                />

                <TextField
                  label="ATK Balance"
                  value={balance}
                  InputProps={{
                    readOnly: true,
                  }}
                />

                <Typography>
                  Chain ID: {chainId}
                </Typography>

                <Divider />

                <Typography>
                  Buy ATK (1 ETH = 10 ATK)
                </Typography>

                <TextField
                  label="ETH"
                  type="number"
                  value={ETHValue}
                  onChange={(e) => setETHValue(e.target.value)}
                />

                <Button
                  variant="contained"
                  onClick={handleBuy}
                >
                  Buy
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Container>
    </div>
  );
}