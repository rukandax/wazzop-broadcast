import { useState, useEffect, useRef } from "react";
import Head from "next/head";
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
  AlertTriangle,
  ExternalLink,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import formatPhoneNumber from "@/lib/formatPhoneNumber";

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
    baseURL: "/api",
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
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] =
    useState(false);

  const [devices, setDevices] = useState<Device[]>([]);

  const DEFAULT_NEW_DEVICE_FORM_DATA = Object.freeze({
    deviceId: "add-new-device",
    name: "",
    method: "code",
    whatsappNumber: "",
  });
  const [newDeviceFormData, setNewDeviceFormData] = useState<{
    deviceId: string;
    name: string;
    method: string;
    whatsappNumber: string;
  }>({
    ...DEFAULT_NEW_DEVICE_FORM_DATA,
  });

  const DEFAULT_BROADCAST_FORM_DATA = Object.freeze({
    deviceId: "",
    messageTemplate: "",
    mediaUrl: "",
    destinationNumbers: "",
  });
  const [broadcastFormData, setBroadcastFormData] = useState<{
    deviceId: string;
    messageTemplate: string;
    mediaUrl: string;
    destinationNumbers: string;
  }>({
    ...DEFAULT_BROADCAST_FORM_DATA,
  });

  const DEFAULT_LOGIN_FORM_DATA = Object.freeze({
    username: "",
    password: "",
  });
  const [loginFormData, setLoginFormData] = useState<{
    username: string;
    password: string;
  }>({
    ...DEFAULT_LOGIN_FORM_DATA,
  });

  const DEFAULT_REGISTRATION_FORM_DATA = Object.freeze({
    fullName: "",
    email: "",
    whatsappNumber: "",
  });
  const [registrationFormData, setRegistrationFormData] = useState<{
    fullName: string;
    email: string;
    whatsappNumber: string;
  }>({
    ...DEFAULT_REGISTRATION_FORM_DATA,
  });

  const [connectDeviceCode, setConnectDeviceCode] = useState("");
  const [connectDeviceQR, setConnectDeviceQR] = useState("");

  const [showConnectCodeModal, setShowConnectCodeModal] = useState(false);
  const [showConnectQRModal, setShowConnectQRModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messageTemplateRef = useRef<HTMLTextAreaElement>(null);
  const destinationNumbersRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (
      !!Cookies.get("username")?.length &&
      !!Cookies.get("password")?.length
    ) {
      getDevicesData(true);
    }

    if (!!Cookies.get("media-url")) {
      setBroadcastFormData((prevData) => ({
        ...prevData,
        mediaUrl: Cookies.get("media-url") || "",
      }));
    }

    if (!!Cookies.get("message-template")) {
      setBroadcastFormData((prevData) => ({
        ...prevData,
        messageTemplate: Cookies.get("message-template") || "",
      }));
    }

    if (!!Cookies.get("destination-number")) {
      setBroadcastFormData((prevData) => ({
        ...prevData,
        destinationNumbers: Cookies.get("destination-number") || "",
      }));
    }
  }, []);

  useEffect(() => {
    getDevicesData();

    setTimeout(() => {
      setShowConnectQRModal(false);
    }, 58_000);
  }, [showConnectQRModal]);

  useEffect(() => {
    getDevicesData();

    setTimeout(() => {
      setShowConnectCodeModal(false);
    }, 58_000);
  }, [showConnectCodeModal]);

  useEffect(() => {
    getDevicesData();
  }, [showAddDeviceModal]);

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

  const delay = async (delay: number) => {
    return await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, delay);
    });
  };

  const handleSubmitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setIsLoading(true);

    if (!broadcastFormData.messageTemplate?.length) {
      toast({
        title: "Error",
        description: "Teks pesan tidak valid",
        variant: "destructive",
      });
    }

    const phoneNumbers = broadcastFormData.destinationNumbers.split("\n");

    if (!!phoneNumbers?.length) {
      for (const phoneNumber of phoneNumbers) {
        try {
          await axiosInstance.post("/send", {
            deviceId: broadcastFormData.deviceId,
            destination: formatPhoneNumber(phoneNumber),
            type: "person",
            text: broadcastFormData.messageTemplate,
            media: {
              url: broadcastFormData.mediaUrl,
              type: "image",
            },
          });

          const randomDelay =
            Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
          await delay(randomDelay);
        } catch {
          // do nothing
        }
      }

      toast({
        title: "Success",
        description: "Pesan sedang dalam proses pengiriman",
      });

      setIsLoading(false);
    } else {
      toast({
        title: "Error",
        description: "Nomor tujuan tidak valid",
        variant: "destructive",
      });
    }
  };

  const getDevicesData = async (isIgnoreAuth: boolean = false) => {
    if (!isAuthenticated && !isIgnoreAuth) {
      return;
    }

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

    await getDevicesData(true);

    setLoginFormData({ ...DEFAULT_LOGIN_FORM_DATA });
    setShowLoginModal(false);
  };

  const handleLogout = async () => {
    Cookies.remove("username");
    Cookies.remove("password");

    setLoginFormData({ ...DEFAULT_LOGIN_FORM_DATA });
    setIsAuthenticated(false);
  };

  const handleDeleteDevice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      if (newDeviceFormData.deviceId !== "add-new-device") {
        await axiosInstance.delete(`/device/${newDeviceFormData.deviceId}`);

        toast({
          title: "Success",
          description: "Berhasil menghapus device",
        });

        setShowAddDeviceModal(false);
      } else {
        toast({
          title: "Error",
          description: "Device ID tidak valid",
          variant: "destructive",
        });
      }
    } catch {
      // do nothing
    } finally {
      await getDevicesData();

      setNewDeviceFormData({ ...DEFAULT_NEW_DEVICE_FORM_DATA });
      setIsLoading(false);
    }
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
            phoneNumber: formatPhoneNumber(newDeviceFormData.whatsappNumber),
          }
        );

        if (!connectDeviceData?.isConnected) {
          if (newDeviceFormData.method === "code") {
            setConnectDeviceCode(connectDeviceData.pairingCode);
            setShowConnectCodeModal(true);
          } else if (newDeviceFormData.method === "qr") {
            setConnectDeviceQR(connectDeviceData.qrString);
            setShowConnectQRModal(true);
          }
        } else {
          setShowAddDeviceModal(false);

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
      await getDevicesData();
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      await axiosInstance.post("/user", {
        fullName: registrationFormData.fullName,
        email: registrationFormData.email,
        phoneNumber: formatPhoneNumber(registrationFormData.whatsappNumber),
      });

      setShowRegisterModal(false);
      setShowRegisterSuccessModal(true);
    } catch {
      // do nothing
    } finally {
      await getDevicesData();
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Wazzop Broadcast - Klaster Digital</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Wazzop Broadcast</h1>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDeviceModal(true)}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center space-x-2"
                  disabled={isLoading}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register</span>
                </Button>
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
                    {device.data.deviceName}{" "}
                    {device.data.deviceStatus === "connected" ||
                    device.data.deviceStatus === "syncing" ? (
                      <>({device.data.phoneNumber}) - Connected</>
                    ) : (
                      <>- Disconnected</>
                    )}
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
                  messages. Click on the &quot;Connect Device&quot; button to
                  add a new device.
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
              onChange={(e) => {
                handleBroadcastFormDataChange(e);
                Cookies.set("message-template", e.target.value);
              }}
              required
              disabled={isLoading}
              className="min-h-[100px] resize-none overflow-hidden"
              ref={messageTemplateRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaUrl">Image URL</Label>
            <Input
              id="mediaUrl"
              name="mediaUrl"
              disabled={isLoading}
              value={broadcastFormData.mediaUrl}
              placeholder="Enter image url (video or audio is not supported yet)"
              onChange={(e) => {
                setBroadcastFormData((prevData) => ({
                  ...prevData,
                  mediaUrl: e.target.value,
                }));
                Cookies.set("media-url", e.target.value);
              }}
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
              onChange={(e) => {
                handleBroadcastFormDataChange(e);
                Cookies.set("destination-number", e.target.value);
              }}
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
          <DialogContent>
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

        <Dialog open={showAddDeviceModal} onOpenChange={setShowAddDeviceModal}>
          <DialogContent>
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
                      <SelectItem key={device.id} value={device.id}>
                        {device.data.deviceName}{" "}
                        {device.data.deviceStatus === "connected" ||
                        device.data.deviceStatus === "syncing" ? (
                          <>({device.data.phoneNumber}) - Connected</>
                        ) : (
                          <>- Disconnected</>
                        )}
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
                    disabled={isLoading}
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
                    placeholder="Enter your WhatsApp number"
                    disabled={isLoading}
                  />
                </div>
              ) : null}

              <DialogFooter>
                <div
                  className={cn(
                    "flex items-center w-full",
                    newDeviceFormData.deviceId === "add-new-device"
                      ? "justify-end"
                      : "justify-between"
                  )}
                >
                  {newDeviceFormData.deviceId !== "add-new-device" ? (
                    <Button
                      disabled={isLoading}
                      variant="destructive"
                      onClick={handleDeleteDevice}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Delete Device"
                      )}
                    </Button>
                  ) : null}

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Connect Device"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showConnectCodeModal}
          onOpenChange={setShowConnectCodeModal}
        >
          <DialogContent>
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
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={0}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={1}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={2}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={3}
                  />
                  <InputOTPSeparator />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={4}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={5}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={6}
                  />
                  <InputOTPSlot
                    className="text-black font-semibold"
                    index={7}
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showConnectQRModal} onOpenChange={setShowConnectQRModal}>
          <DialogContent>
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
                onClick={() => setShowConnectQRModal(false)}
                disabled={isLoading}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
          <DialogContent>
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
          <DialogContent>
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
          <p>Powered by Klaster Digital WhatsApp API Gateway</p>
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
            <a
              href="https://github.com/rukandax/wazzop-broadcast"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:text-gray-700 transition-colors"
            >
              Github Repository
              <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
