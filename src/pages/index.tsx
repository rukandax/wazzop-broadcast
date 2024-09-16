"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import QRCode from "react-qr-code";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  UserCircle,
  LogIn,
  Smartphone,
  Loader2,
  UserPlus,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Device = {
  id: string;
  data: {
    createdAt: number;
    deviceId: string;
    deviceName: string;
    deviceStatus: "connected" | "disconnected" | "syncing";
    phoneNumber: "string";
    updatedAt: number;
    userId: string;
  };
};

export default function Home() {
  const { toast } = useToast();

  const axiosInstance = axios.create({
    baseURL: "http://103.127.133.3/whatsapp-api",
    timeout: 6000,
  });

  axiosInstance.interceptors.request.use(
    (config) => {
      if (
        !!Cookies.get("username")?.length &&
        !!Cookies.get("password")?.length
      ) {
        const basicAuth = `Basic ${btoa(
          `${Cookies.get("username")}:${Cookies.get("password")}`
        )}`;
        config.headers["Authorization"] = basicAuth;
      } else {
        toast({
          title: "Error",
          description: "Username dan Password tidak valid",
          variant: "destructive",
        });
      }

      return config;
    },
    (error) => {
      toast({
        title: "Error",
        description: "Terjadi kesalahan #1",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        Cookies.remove("username");
        Cookies.remove("password");
      }

      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message || "Terjadi kesalahan #2",
        variant: "destructive",
      });

      return Promise.reject(error);
    }
  );

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] =
    useState(false);

  const [devices, setDevices] = useState<Device[]>([]);

  const [newDeviceFormData, setNewDeviceFormData] = useState({
    deviceId: "add-new-device",
    name: "",
    method: "code",
    whatsappNumber: "",
  });
  const [broadcastFormData, setBroadcastFormData] = useState({
    deviceId: "",
    messageTemplate: "",
    destinationNumbers: "",
  });
  const [loginFormData, setLoginFormData] = useState({
    username: "",
    password: "",
  });
  const [registrationFormData, setRegistrationFormData] = useState({
    fullName: "",
    email: "",
    whatsappNumber: "",
    source: "",
    purpose: "",
  });

  const [connectDeviceCode, setConnectDeviceCode] = useState("");
  const [connectDeviceQR, setConnectDeviceQR] = useState("");

  const [showConnectCodeModal, setShowConnectCodeModal] = useState(false);
  const [showConnectQRCodeModal, setShowConnectQRCodeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messageTemplateRef = useRef<HTMLTextAreaElement>(null);
  const destinationNumbersRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (
      !!Cookies.get("username")?.length &&
      !!Cookies.get("password")?.length
    ) {
      getDevicesData();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      getDevicesData();
    }

    setTimeout(() => {
      setShowConnectQRCodeModal(false);
    }, 58_000);
  }, [showConnectQRCodeModal]);

  const handleBroadcastFormDataChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBroadcastFormData((prevState) => ({ ...prevState, [name]: value }));
    adjustTextareaHeight(e.target);
  };

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    if (messageTemplateRef.current) {
      adjustTextareaHeight(messageTemplateRef.current);
    }
    if (destinationNumbersRef.current) {
      adjustTextareaHeight(destinationNumbersRef.current);
    }
  }, [broadcastFormData.messageTemplate, broadcastFormData.destinationNumbers]);

  const handleSubmitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
      setIsLoading(true);

      broadcastFormData.destinationNumbers
        .split("\n")
        .forEach(async (phoneNumber: string) => {
          await axiosInstance.post("/send", {
            deviceId: broadcastFormData.deviceId,
            destination: phoneNumber,
            type: "person",
            text: broadcastFormData.messageTemplate,
          });
        });
    } catch {
      // do nothing
    } finally {
      setIsLoading(false);

      toast({
        title: "Success",
        description: "Pesan sedang dalam proses pengiriman",
      });
    }
  };

  const getDevicesData = async () => {
    try {
      setIsLoading(true);

      const { data } = await axiosInstance.get("/device");

      if (data.length > 0) {
        setDevices(data);
        setBroadcastFormData((prevData) => ({
          ...prevData,
          deviceId: data[0].id,
        }));
      }

      setShowLoginModal(false);
      setIsAuthenticated(true);
    } catch {
      // do nothing
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    Cookies.set("username", loginFormData.username);
    Cookies.set("password", loginFormData.password);

    await getDevicesData();
  };

  const handleLogout = async () => {
    Cookies.remove("username");
    Cookies.remove("password");

    setIsAuthenticated(false);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      let addDeviceData: any;

      if (newDeviceFormData.deviceId === "add-new-device") {
        const { data } = await axiosInstance.post("/device", {
          deviceName: newDeviceFormData.name,
        });

        addDeviceData = data;
      }

      if (
        !!addDeviceData?.id ||
        newDeviceFormData.deviceId !== "add-new-device"
      ) {
        const { data: connectDeviceData } = await axiosInstance.post(
          "/device/connect",
          {
            deviceId:
              newDeviceFormData.deviceId === "add-new-device"
                ? addDeviceData.id
                : newDeviceFormData.deviceId,
            method: newDeviceFormData.method,
            phoneNumber: newDeviceFormData.whatsappNumber,
          }
        );

        if (!connectDeviceData?.isConnected) {
          if (newDeviceFormData.method === "code") {
            setConnectDeviceCode(connectDeviceData.pairingCode);
            setShowConnectCodeModal(true);
          } else if (newDeviceFormData.method === "qr") {
            setConnectDeviceQR(connectDeviceData.qrString);
            setShowConnectQRCodeModal(true);
          }
        } else {
          await getDevicesData();
          setShowDeviceModal(false);

          toast({
            title: "Success",
            description: "Device telah berhasil terkoneksi",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Error saat menambahkan device baru",
          variant: "destructive",
        });
      }
    } catch {
      // do nothing
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // await simulateApiCall(() => {
    //   console.log("Registration data:", registrationFormData);
    //   setShowRegisterModal(false);
    //   setShowRegisterSuccessModal(true);
    // });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold mb-4 sm:mb-0">Wazzop Broadcast</h1>
        <div className="flex flex-wrap justify-center sm:justify-end gap-2">
          {isAuthenticated ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeviceModal(true)}
                className="flex items-center space-x-2"
                disabled={isLoading}
              >
                <Smartphone className="h-4 w-4" />
                <span>Connect Device</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2"
                disabled={isLoading}
              >
                <UserCircle className="h-4 w-4" />
                <span>Log Out</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="flex items-center space-x-2"
                disabled={isLoading}
              >
                <LogIn className="h-4 w-4" />
                <span>Log In</span>
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegisterModal(true)}
                className="flex items-center space-x-2"
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4" />
                <span>Register</span>
              </Button> */}
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmitBroadcast} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="device">Select Device</Label>
          <Select
            value={broadcastFormData.deviceId || ""}
            onValueChange={(value: string) => {
              setBroadcastFormData((prevData) => ({
                ...prevData,
                deviceId: value,
              }));
            }}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.data.deviceName} (
                  {device.data.deviceStatus.toUpperCase()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {devices.length === 0 && (
            <Alert className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No devices available</AlertTitle>
              <AlertDescription>
                You need to add a new device before you can broadcast WhatsApp
                messages. Click on the &quot;Connect Device&quot; button to add
                a new device.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="messageTemplate">Message Template</Label>
          <Textarea
            id="messageTemplate"
            name="messageTemplate"
            placeholder="Enter WhatsApp text, support WhatsApp formatting"
            value={broadcastFormData.messageTemplate}
            onChange={handleBroadcastFormDataChange}
            required
            disabled={isLoading}
            className="min-h-[100px] resize-none overflow-hidden"
            ref={messageTemplateRef}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationNumbers">
            Destination WhatsApp Numbers
          </Label>
          <Textarea
            id="destinationNumbers"
            name="destinationNumbers"
            placeholder="Enter WhatsApp numbers, one per line"
            value={broadcastFormData.destinationNumbers}
            onChange={handleBroadcastFormDataChange}
            required
            disabled={isLoading}
            className="min-h-[100px] resize-none overflow-hidden"
            ref={destinationNumbersRef}
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || devices.length === 0}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Broadcast"
          )}
        </Button>
      </form>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Login to Wazzop</DialogTitle>
            <DialogDescription>
              Please log in to send your Wazzop broadcast.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                required
                disabled={isLoading}
                value={loginFormData.username}
                onChange={(e) =>
                  setLoginFormData((prevData) => ({
                    ...prevData,
                    username: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                disabled={isLoading}
                value={loginFormData.password}
                onChange={(e) =>
                  setLoginFormData((prevData) => ({
                    ...prevData,
                    password: e.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeviceModal} onOpenChange={setShowDeviceModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Connect Device to Wazzop</DialogTitle>
            <DialogDescription>
              Add a new device or connect to an existing one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDevice} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device">Select or Add Device</Label>
              <Select
                onValueChange={(value: string) => {
                  setNewDeviceFormData((prevData) => ({
                    ...prevData,
                    deviceId: value,
                  }));
                }}
                value={newDeviceFormData.deviceId}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or Add Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="add-new-device" value="add-new-device">
                    Add a New Device
                  </SelectItem>
                  {devices.map((device) => (
                    <SelectItem
                      key={device.id}
                      value={device.id}
                      disabled={
                        device.data.deviceStatus === "connected" ||
                        device.data.deviceStatus === "syncing"
                      }
                    >
                      {device.data.deviceName} (
                      {device.data.deviceStatus === "connected" ||
                      device.data.deviceStatus === "syncing"
                        ? "Already Connected"
                        : "Disconnected"}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newDeviceFormData.deviceId === "add-new-device" ? (
              <div className="space-y-2">
                <Label htmlFor="deviceName">Device Name</Label>
                <Input
                  id="deviceName"
                  value={newDeviceFormData.name}
                  onChange={(e) =>
                    setNewDeviceFormData((prevData) => ({
                      ...prevData,
                      name: e.target.value,
                    }))
                  }
                  required={newDeviceFormData.deviceId === "add-new-device"}
                  disabled={
                    isLoading ||
                    !["", "add-new-device", null].includes(
                      newDeviceFormData.deviceId
                    )
                  }
                  placeholder={
                    newDeviceFormData.deviceId === "add-new-device"
                      ? "Enter device name"
                      : devices.find(
                          (dev) => dev.id === newDeviceFormData.deviceId
                        )?.data.deviceName || ""
                  }
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Connect Method</Label>
              <RadioGroup
                value={newDeviceFormData.method}
                onValueChange={(value) =>
                  setNewDeviceFormData((prevData) => ({
                    ...prevData,
                    method: value,
                  }))
                }
                disabled={isLoading}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="code" id="code" />
                  <Label htmlFor="code">Input Code</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="qr" id="qr" />
                  <Label htmlFor="qr">Scan QR</Label>
                </div>
              </RadioGroup>
            </div>
            {newDeviceFormData.method === "code" ? (
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                  id="whatsappNumber"
                  value={newDeviceFormData.whatsappNumber}
                  onChange={(e) =>
                    setNewDeviceFormData((prevData) => ({
                      ...prevData,
                      whatsappNumber: e.target.value,
                    }))
                  }
                  required={newDeviceFormData.method === "code"}
                  disabled={isLoading}
                />
              </div>
            ) : null}

            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Add Device"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConnectCodeModal}
        onOpenChange={setShowConnectCodeModal}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Enter WhatsApp Code</DialogTitle>
            <DialogDescription>
              Please enter this 8-digit code on your WhatsApp Device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="codeInput">WhatsApp Code</Label>
            <InputOTP maxLength={8} value={connectDeviceCode} disabled>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSeparator />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConnectQRCodeModal}
        onOpenChange={setShowConnectQRCodeModal}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
            <DialogDescription>
              Please scan this QR code with your WhatsApp device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center h-64 bg-gray-100">
            <QRCode value={connectDeviceQR} className="h-48 w-48" />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowConnectQRCodeModal(false)}
              disabled={isLoading}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Register for Wazzop</DialogTitle>
            <DialogDescription>
              Create your account to start using Wazzop.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                value={registrationFormData.fullName}
                onChange={(e) =>
                  setRegistrationFormData((prevData) => ({
                    ...prevData,
                    fullName: e.target.value,
                  }))
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={registrationFormData.email}
                onChange={(e) =>
                  setRegistrationFormData((prevData) => ({
                    ...prevData,
                    email: e.target.value,
                  }))
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                name="whatsappNumber"
                value={registrationFormData.whatsappNumber}
                onChange={(e) =>
                  setRegistrationFormData((prevData) => ({
                    ...prevData,
                    whatsappNumber: e.target.value,
                  }))
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Where did you hear about Wazzop?</Label>
              <Select
                name="source"
                value={registrationFormData.source}
                onValueChange={(value) =>
                  setRegistrationFormData((prevData) => ({
                    ...prevData,
                    source: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_media">
                    Social Media (Facebook/Instagram/YouTube/TikTok)
                  </SelectItem>
                  <SelectItem value="friends_family">Friends/Family</SelectItem>
                  <SelectItem value="search_engine">
                    Search Engine (Google/Bing)
                  </SelectItem>
                  <SelectItem value="blog_article">Blog/Article</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">
                What&apos;s your purpose for using Wazzop?
              </Label>
              <Select
                name="purpose"
                value={registrationFormData.purpose}
                onValueChange={(value) =>
                  setRegistrationFormData((prevData) => ({
                    ...prevData,
                    purpose: value,
                  }))
                }
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="educational">
                    Educational Purpose
                  </SelectItem>
                  <SelectItem value="marketing">Marketing Purpose</SelectItem>
                  <SelectItem value="job_related">
                    Other Job-related Purpose
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRegisterSuccessModal}
        onOpenChange={setShowRegisterSuccessModal}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Registration Successful</DialogTitle>
            <DialogDescription>
              Your Wazzop account has been created successfully.
            </DialogDescription>
          </DialogHeader>
          <p>
            Your username and password have been sent to the email address you
            provided. Please check your email to access your account.
          </p>
          <DialogFooter>
            <Button onClick={() => setShowRegisterSuccessModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Powered by Wazzop WhatsApp API Gateway</p>
        <div className="mt-4 flex justify-center space-x-4">
          <a
            href="https://documenter.getpostman.com/view/1475413/2sA3XY7dxK"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-gray-700 transition-colors"
          >
            API Documentation
            <ExternalLink className="ml-1 h-4 w-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
