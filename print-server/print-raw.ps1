param(
  [string]$PrinterName,
  [string]$DataFile
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
    [DllImport("winspool.Drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", CharSet=CharSet.Auto, SetLastError=true)]
    public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DocInfo1 di);

    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", SetLastError=true)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)]
    public struct DocInfo1 {
        [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPTStr)] public string pDatatype;
    }

    public static bool SendRaw(string printerName, byte[] data) {
        IntPtr hPrinter = IntPtr.Zero;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
        try {
            DocInfo1 di = new DocInfo1 { pDocName = "Receipt", pDatatype = "RAW" };
            if (StartDocPrinter(hPrinter, 1, ref di) == 0) return false;
            StartPagePrinter(hPrinter);
            IntPtr ptr = Marshal.AllocHGlobal(data.Length);
            Marshal.Copy(data, 0, ptr, data.Length);
            int written;
            WritePrinter(hPrinter, ptr, data.Length, out written);
            Marshal.FreeHGlobal(ptr);
            EndPagePrinter(hPrinter);
            EndDocPrinter(hPrinter);
            return true;
        } finally {
            ClosePrinter(hPrinter);
        }
    }
}
"@

$data = [System.IO.File]::ReadAllBytes($DataFile)
$ok = [RawPrinter]::SendRaw($PrinterName, $data)
if ($ok) { Write-Host "OK"; exit 0 } else { Write-Host "FAIL"; exit 1 }
