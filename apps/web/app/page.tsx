"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  encryptAndSave,
  fetchTransaction,
  decryptTransaction,
} from "@/lib/api";
import { Lock, Unlock, Search, Shield } from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const [partyId, setPartyId] = useState("");
  const [payload, setPayload] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleEncrypt = async () => {
    setResult(null);
    setLoading(true);

    try {
      const payloadObj = JSON.parse(payload);
      const response = await encryptAndSave(partyId, payloadObj);
      setResult(response);
      setTransactionId(response.id);
      toast.success("Transaction encrypted and saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Invalid JSON or encryption failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    setResult(null);
    setLoading(true);

    try {
      const response = await fetchTransaction(transactionId);
      setResult(response);
      toast.success("Transaction fetched successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async () => {
    setResult(null);
    setLoading(true);

    try {
      const response = await decryptTransaction(transactionId);
      setResult(response);
      toast.success("Transaction decrypted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Decryption failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">
              Secure Transaction Service
            </h1>
          </div>
          <p className="text-muted-foreground">
            AES-256-GCM Envelope Encryption Demo
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Encrypt & Store
            </CardTitle>
            <CardDescription>
              Enter your transaction data to encrypt and store securely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partyId">Party ID</Label>
              <Input
                id="partyId"
                placeholder="party_123"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payload">JSON Payload</Label>
              <Textarea
                id="payload"
                placeholder='{"amount": 100, "currency": "AED"}'
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleEncrypt}
              disabled={loading || !partyId || !payload}
              className="w-full"
            >
              <Lock className="mr-2 h-4 w-4" />
              Encrypt & Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Fetch & Decrypt
            </CardTitle>
            <CardDescription>
              Retrieve and decrypt a stored transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transactionId">Transaction ID</Label>
              <Input
                id="transactionId"
                placeholder="clxxxx..."
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleFetch}
                disabled={loading || !transactionId}
                variant="outline"
                className="flex-1"
              >
                <Search className="mr-2 h-4 w-4" />
                Fetch
              </Button>
              <Button
                onClick={handleDecrypt}
                disabled={loading || !transactionId}
                className="flex-1"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Decrypt
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
