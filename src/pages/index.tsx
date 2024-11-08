import { useState, useEffect, useRef, useMemo } from "react";
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
import { cn } from "@/lib/utils";
import formatPhoneNumber from "@/lib/formatPhoneNumber";
import MultipleSelector, {
  Option,
} from "@/components/custom/multiple-selector";

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

type Group = {
  id: string;
  subject: string;
  size: number;
  owner: string;
  creation: number;
  restrict: boolean;
  announce: boolean;
  isCommunityAnnounce: boolean;
  isCommunity: boolean;
  isAdmin: boolean;
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
  const [showSubmitProgressModal, setShowSubmitProgressModal] = useState(false);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] =
    useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        label: `${group.subject} (${group.size} Member)${
          group.isAdmin ? " - Admin" : ""
        }`,
        value: group.id,
      })),
    [groups]
  );

  const DEFAULT_NEW_DEVICE_FORM_DATA = Object.freeze({
    deviceId: "add-new-device",
    name: "",
  });
  const [newDeviceFormData, setNewDeviceFormData] = useState<{
    deviceId: string;
    name: string;
  }>({
    ...DEFAULT_NEW_DEVICE_FORM_DATA,
  });

  const DEFAULT_BROADCAST_FORM_DATA = Object.freeze({
    deviceId: "",
    messageTemplate: "",
    mediaUrl: "",
    destinationType: "person",
    destinations: "",
    groupIds: [],
  });
  const [broadcastFormData, setBroadcastFormData] = useState<{
    deviceId: string;
    messageTemplate: string;
    mediaUrl: string;
    destinationType: string;
    destinations: string;
    groupIds: Option[];
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

  const [connectDeviceQR, setConnectDeviceQR] = useState("");

  const [showConnectQRModal, setShowConnectQRModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitIndex, setSubmitIndex] = useState(0);

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
        destinations: Cookies.get("destination-number") || "",
      }));
    }
  }, []);

  useEffect(() => {
    getDevicesData();
  }, [showConnectQRModal]);

  useEffect(() => {
    getDevicesData();
  }, [showAddDeviceModal]);

  useEffect(() => {
    if (broadcastFormData.destinationType === "group") {
      getGroupsData();
    }
  }, [broadcastFormData.destinationType]);

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
  }, [broadcastFormData.messageTemplate, broadcastFormData.destinations]);

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

    if (!broadcastFormData.deviceId) {
      toast({
        title: "Error",
        description: "Harap pilih device terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    if (!broadcastFormData.messageTemplate?.length) {
      toast({
        title: "Error",
        description: "Teks pesan tidak valid",
        variant: "destructive",
      });
      return;
    }

    if (
      broadcastFormData.destinationType === "person" &&
      !broadcastFormData.destinations?.length
    ) {
      toast({
        title: "Error",
        description: "Nomor tujuan tidak valid",
        variant: "destructive",
      });
      return;
    }

    if (
      broadcastFormData.destinationType === "group" &&
      !broadcastFormData.groupIds?.length
    ) {
      toast({
        title: "Error",
        description: "Group tujuan tidak valid",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSubmitIndex(0);
    setShowSubmitProgressModal(true);

    const phoneNumbers = broadcastFormData.destinations.trim().split("\n");

    if (!!phoneNumbers?.length) {
      let sendDestinationItem: string[] = [];

      const anchorLoop =
        broadcastFormData.destinationType === "person"
          ? phoneNumbers
          : broadcastFormData.groupIds.map((group) => group.value);

      for (const destinationItem of anchorLoop) {
        setSubmitIndex((prevData) => prevData + 1);

        if (
          sendDestinationItem.includes(formatPhoneNumber(destinationItem)) ||
          !destinationItem
        ) {
          continue;
        }

        try {
          await axiosInstance.post("/send", {
            deviceId: broadcastFormData.deviceId,
            destination:
              broadcastFormData.destinationType === "person"
                ? formatPhoneNumber(destinationItem)
                : destinationItem,
            type: broadcastFormData.destinationType,
            text: `${broadcastFormData.messageTemplate}\n\n> Pesan ini dikirim melalui Wazzop Broadcast`,
            media: !!broadcastFormData.mediaUrl
              ? {
                  url: broadcastFormData.mediaUrl,
                  type: "image",
                }
              : undefined,
          });

          const randomDelay =
            Math.floor(Math.random() * (4000 - 2000 + 1)) + 2000;
          await delay(randomDelay);

          sendDestinationItem.push(formatPhoneNumber(destinationItem));
        } catch (error: any) {
          toast({
            title: "Error",
            description:
              error?.response?.data?.error?.message ||
              "Terjadi kesalahan Saat Mengirim Pesan",
            variant: "destructive",
          });
        }
      }

      sendDestinationItem = [];

      setIsLoading(false);
      setShowSubmitProgressModal(false);
      setSubmitIndex(0);
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
      } else {
        setDevices([]);
      }

      setBroadcastFormData((prevData) => ({
        ...prevData,
        deviceId: "",
      }));

      setIsAuthenticated(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          "Terjadi kesalahan Saat Mengambil Data Device",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGroupsData = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);

      const { data } = await axiosInstance.get<Group[]>("/group", {
        params: {
          deviceId: broadcastFormData.deviceId,
        },
      });

      if (data.length > 0) {
        const groupData = data.filter(
          (group) =>
            ((group.announce || group.isCommunityAnnounce) && group.isAdmin) ||
            (!group.announce && !group.isCommunityAnnounce && !group.isAdmin)
        );

        setGroups(groupData);
      } else {
        setGroups([]);
      }

      setBroadcastFormData((prevData) => ({
        ...prevData,
        groupId: "",
      }));
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          "Terjadi kesalahan Saat Mengambil Data Grup",
        variant: "destructive",
      });
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
    setDevices([]);
    setBroadcastFormData((prevData) => ({ ...prevData, deviceId: "" }));

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
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          "Terjadi kesalahan Saat Menghapus Device",
        variant: "destructive",
      });
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
          }
        );

        if (!connectDeviceData?.isConnected) {
          setConnectDeviceQR(connectDeviceData.qrString);
          setShowConnectQRModal(true);
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
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          "Terjadi kesalahan Saat Menambahkan Device",
        variant: "destructive",
      });
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
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message ||
          "Terjadi kesalahan Saat Mendaftar",
        variant: "destructive",
      });
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
                  <span>Keluar</span>
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
                  <span>Masuk</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center space-x-2"
                  disabled={isLoading}
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Daftar Gratis</span>
                </Button>
                {/* <Link
                  href="https://forms.gle/3Dm9gbmf4u2JfqpHA"
                  target="_blank"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                    disabled={isLoading}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Daftar Gratis</span>
                  </Button>
                </Link> */}
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitBroadcast} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="device">Pilih Device</Label>
            <Select
              value={broadcastFormData.deviceId || ""}
              onValueChange={(value: string) => {
                setBroadcastFormData((prevData) => ({
                  ...prevData,
                  deviceId: value,
                }));
              }}
              disabled={isLoading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Device" />
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
            {devices.length === 0 ? (
              <Alert className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tidak Ada Device Terdaftar</AlertTitle>
                <AlertDescription>
                  Anda perlu menambahkan setidaknya 1 device untuk bisa mengirim
                  pesan. Silahkan{" "}
                  {!isAuthenticated
                    ? `klik 'Masuk' dan isi kolom Username beserta Password, lalu `
                    : ""}
                  klik &apos;Connect Device&apos; untuk menambahkan device baru.
                </AlertDescription>
              </Alert>
            ) : (
              !broadcastFormData.deviceId && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Silahkan Pilih Device</AlertTitle>
                  <AlertDescription>
                    Anda perlu memilih setidaknya 1 device untuk bisa mengirim
                    pesan.
                  </AlertDescription>
                </Alert>
              )
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageTemplate">Teks Pesan</Label>
            <Textarea
              id="messageTemplate"
              name="messageTemplate"
              placeholder="Masukan teks pesan, mendukung formatting WhatsApp"
              value={broadcastFormData.messageTemplate}
              onChange={(e) => {
                handleBroadcastFormDataChange(e);
                Cookies.set("message-template", e.target.value);
              }}
              required
              disabled={isLoading || !broadcastFormData.deviceId}
              className="min-h-[100px] resize-none overflow-hidden"
              ref={messageTemplateRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediaUrl">URL Gambar</Label>
            <Input
              id="mediaUrl"
              name="mediaUrl"
              disabled={isLoading || !broadcastFormData.deviceId}
              value={broadcastFormData.mediaUrl}
              placeholder="Masukan URL gambar (tidak bisa video atau audio)"
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
            <Label htmlFor="destinations">Jenis Tujuan</Label>
            <Select
              value={broadcastFormData.destinationType || ""}
              onValueChange={(value: string) => {
                setBroadcastFormData((prevData) => ({
                  ...prevData,
                  destinationType: value,
                }));
              }}
              disabled={isLoading || !broadcastFormData.deviceId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Jenis Tujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">List Nomor WhatsApp</SelectItem>
                <SelectItem value="group">List Grup WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {broadcastFormData.destinationType === "person" && (
            <div className="space-y-2">
              <Label htmlFor="destinations">Nomor Tujuan</Label>
              <Textarea
                id="destinations"
                name="destinations"
                placeholder="Masukan nomor tujuan, satu nomor per baris"
                value={broadcastFormData.destinations}
                onChange={(e) => {
                  handleBroadcastFormDataChange(e);
                  Cookies.set("destination-number", e.target.value);
                }}
                required
                disabled={isLoading || !broadcastFormData.deviceId}
                className="min-h-[100px] resize-none overflow-hidden"
                ref={destinationNumbersRef}
              />
            </div>
          )}

          {!isLoading && broadcastFormData.destinationType === "group" && (
            <div className="space-y-2">
              <Label htmlFor="destinations">Grup Tujuan</Label>
              <MultipleSelector
                value={broadcastFormData.groupIds || []}
                onChange={(values: Option[]) => {
                  setBroadcastFormData((prevData) => ({
                    ...prevData,
                    groupIds: values,
                  }));
                }}
                defaultOptions={groupOptions}
                placeholder="Pilih Grup Tujuan"
                emptyIndicator={
                  <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                    Tidak Ada Grup Yang Bisa Dipilih
                  </p>
                }
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || devices.length === 0}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Kirim Broadcast"
            )}
          </Button>
        </form>

        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Masuk Ke Wazzop</DialogTitle>
              <DialogDescription>
                Silahkan login untuk bisa menggunakan Wazzop
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Masukan username"
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
                  placeholder="Masukan password"
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
                      Dalam Proses...
                    </>
                  ) : (
                    "Masuk"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddDeviceModal} onOpenChange={setShowAddDeviceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Device</DialogTitle>
              <DialogDescription>
                Tambah Device Baru atau Connect Device yang sudah ada sebelumnya
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device">Tambah atau Pilih Device</Label>
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
                    <SelectValue placeholder="Tambah atau Pilih Device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="add-new-device" value="add-new-device">
                      + Tambah Device Baru
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
                  <Label htmlFor="deviceName">Nama Device</Label>
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
                        ? "Masukan nama device"
                        : devices.find(
                            (dev) => dev.id === newDeviceFormData.deviceId
                          )?.data.deviceName || ""
                    }
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
                          Dalam Proses...
                        </>
                      ) : (
                        "Hapus Device"
                      )}
                    </Button>
                  ) : null}

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Dalam Proses...
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

        <Dialog open={showConnectQRModal} onOpenChange={setShowConnectQRModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Silahkan scan QR Code dibawah ini melalui perangkat Anda
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
              <DialogTitle>Daftar Wazzop</DialogTitle>
              <DialogDescription>
                Buat akun untuk mulai menggunakan Wazzop
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder="Masukan nama lengkap"
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
                  placeholder="Masukan email"
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
                <Label htmlFor="whatsappNumber">Nomor WhatsApp</Label>
                <Input
                  id="whatsappNumber"
                  name="whatsappNumber"
                  placeholder="Masukan nomor WhatsApp"
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
                      Dalam Proses...
                    </>
                  ) : (
                    "Daftar"
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
              <DialogTitle>Pendaftaran Berhasil</DialogTitle>
              <DialogDescription>
                Akun Wazzop Anda berhasil didaftarkan
              </DialogDescription>
            </DialogHeader>
            <p>
              Username dan Password Wazzop dikirimkan melalui email, silahkan
              cek email Anda untuk mulai menggunakan Wazzop
            </p>
            <DialogFooter>
              <Button onClick={() => setShowRegisterSuccessModal(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showSubmitProgressModal}
          onOpenChange={(isOpen) => {
            if (isLoading) {
              setShowSubmitProgressModal(true);
            } else {
              setShowSubmitProgressModal(isOpen);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Pengiriman Pesan Dalam Proses {submitIndex}/
                {broadcastFormData.destinations.trim().split("\n").length}
              </DialogTitle>
            </DialogHeader>
            <p>
              Mohon untuk tidak memuat ulang (refresh) halaman dan juga tidak
              menutup (close) halaman ini selama proses masih berlangsung
            </p>
          </DialogContent>
        </Dialog>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Dibuat Oleh Klaster Digital</p>
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
