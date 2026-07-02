package com.online.businesscard;

import android.content.SharedPreferences;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * Android Host APDU Service to emulate an NFC Forum Type 4 Tag containing a NDEF URL record.
 */
public class MyCardApduService extends HostApduService {
    private static final String TAG = "MyCardApduService";

    // ISO-DEP Command APDU Instructions
    private static final byte[] APDU_SELECT_NDEF_TAG_APPLICATION = {
        (byte) 0x00, // CLA
        (byte) 0xA4, // INS (Select)
        (byte) 0x04, // P1 (Select by name)
        (byte) 0x00, // P2
        (byte) 0x07, // Lc (Length of AID)
        (byte) 0xD2, (byte) 0x76, (byte) 0x00, (byte) 0x00, (byte) 0x85, (byte) 0x01, (byte) 0x01, // AID: D2760000850101
        (byte) 0x00  // Le
    };

    private static final byte[] APDU_SELECT_CC_FILE = {
        (byte) 0x00, (byte) 0xA4, (byte) 0x00, (byte) 0x0C, (byte) 0x02,
        (byte) 0xE1, (byte) 0x03 // File ID: E103 (Capability Container)
    };

    private static final byte[] APDU_SELECT_NDEF_FILE = {
        (byte) 0x00, (byte) 0xA4, (byte) 0x00, (byte) 0x0C, (byte) 0x02,
        (byte) 0xE1, (byte) 0x04 // File ID: E104 (NDEF Data File)
    };

    private static final byte[] APDU_READ_BINARY = {
        (byte) 0x00, (byte) 0xB0 // INS (Read Binary)
    };

    // Success Status APDU Response (90 00)
    private static final byte[] APDU_RESPONSE_SUCCESS = { (byte) 0x90, (byte) 0x00 };
    private static final byte[] APDU_RESPONSE_FAILURE = { (byte) 0x6A, (byte) 0x82 };

    // Capability Container Content for Type 4 Tag
    private static final byte[] CC_FILE_CONTENT = {
        (byte) 0x00, (byte) 0x0F, // CC Length (15 bytes)
        (byte) 0x20,             // Mapping Version 2.0
        (byte) 0x00, (byte) 0x3B, // Max data read length (59 bytes)
        (byte) 0x00, (byte) 0x34, // Max data write length (52 bytes)
        (byte) 0x04,             // NDEF File Control TLV Tag
        (byte) 0x06,             // Length
        (byte) 0xE1, (byte) 0x04, // NDEF File ID
        (byte) 0x00, (byte) 0xFF, // Max NDEF File Size (255 bytes)
        (byte) 0x00,             // Read Access (00h = granted)
        (byte) 0xFF              // Write Access (FFh = denied)
    };

    // State Tracking
    private boolean isTagSelected = false;
    private int selectedFile = 0; // 1 = CC File, 2 = NDEF File

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null) {
            return APDU_RESPONSE_FAILURE;
        }

        Log.d(TAG, "Command received: " + bytesToHex(commandApdu));

        // 1. SELECT AID
        if (Arrays.equals(APDU_SELECT_NDEF_TAG_APPLICATION, commandApdu)) {
            Log.d(TAG, "NDEF Tag Selected.");
            isTagSelected = true;
            selectedFile = 0;
            return APDU_RESPONSE_SUCCESS;
        }

        if (!isTagSelected) {
            return APDU_RESPONSE_FAILURE;
        }

        // 2. SELECT FILE
        if (commandApdu.length >= 4 && commandApdu[0] == 0x00 && commandApdu[1] == (byte) 0xA4) {
            if (Arrays.equals(APDU_SELECT_CC_FILE, commandApdu)) {
                Log.d(TAG, "CC File Selected.");
                selectedFile = 1;
                return APDU_RESPONSE_SUCCESS;
            } else if (Arrays.equals(APDU_SELECT_NDEF_FILE, commandApdu)) {
                Log.d(TAG, "NDEF File Selected.");
                selectedFile = 2;
                return APDU_RESPONSE_SUCCESS;
            }
            return APDU_RESPONSE_FAILURE;
        }

        // 3. READ BINARY
        if (commandApdu.length >= 2 && commandApdu[0] == 0x00 && commandApdu[1] == (byte) 0xB0) {
            int offset = ((commandApdu[2] & 0xFF) << 8) | (commandApdu[3] & 0xFF);
            int length = 0;
            if (commandApdu.length > 4) {
                length = commandApdu[4] & 0xFF;
            }

            if (selectedFile == 1) { // CC File
                Log.d(TAG, "Reading CC File. Offset: " + offset);
                return createResponse(CC_FILE_CONTENT, offset, length);
            } else if (selectedFile == 2) { // NDEF Data File
                Log.d(TAG, "Reading NDEF File. Offset: " + offset);
                byte[] ndefContent = getNdefData();
                return createResponse(ndefContent, offset, length);
            }
        }

        return APDU_RESPONSE_FAILURE;
    }

    @Override
    public void onDeactivated(int reason) {
        Log.d(TAG, "Deactivated with reason: " + reason);
        isTagSelected = false;
        selectedFile = 0;
    }

    /**
     * Dynamically generates the NDEF message containing the URL record.
     */
    private byte[] getNdefData() {
        // Fetch saved card ID from Capacitor SharedPreferences
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
        String cardId = prefs.getString("my_card_id", "demo");
        
        // Define base sharing URL
        String urlStr = "https://myeongham-share.vercel.app/share/?id=" + cardId;
        
        // NDEF URI Record format
        // https://www. is abbreviated as 0x02 in NDEF prefix
        String uriBody;
        byte prefixByte;
        if (urlStr.startsWith("https://www.")) {
            prefixByte = 0x02;
            uriBody = urlStr.substring(12);
        } else if (urlStr.startsWith("http://www.")) {
            prefixByte = 0x01;
            uriBody = urlStr.substring(11);
        } else if (urlStr.startsWith("https://")) {
            prefixByte = 0x04;
            uriBody = urlStr.substring(8);
        } else if (urlStr.startsWith("http://")) {
            prefixByte = 0x03;
            uriBody = urlStr.substring(7);
        } else {
            prefixByte = 0x00; // No abbreviation
            uriBody = urlStr;
        }

        byte[] uriBodyBytes = uriBody.getBytes(StandardCharsets.UTF_8);
        int payloadLength = 1 + uriBodyBytes.length; // 1 byte prefix + payload body

        ByteArrayOutputStream ndefPayload = new ByteArrayOutputStream();
        ndefPayload.write((byte) 0xD1); // TNF: Well-known Type, Short Record, Message Begin, Message End
        ndefPayload.write((byte) 0x01); // Type Length: 1 byte
        ndefPayload.write((byte) payloadLength); // Payload Length
        ndefPayload.write((byte) 'U');  // Type: "U" (URI Record)
        ndefPayload.write(prefixByte);  // URI Prefix Abbreviation
        ndefPayload.write(uriBodyBytes, 0, uriBodyBytes.length);

        byte[] ndefMessage = ndefPayload.toByteArray();
        int totalLength = ndefMessage.length;

        // Wrap NDEF message inside Type 4 Tag File format: [Length_High] [Length_Low] [NDEF Message]
        byte[] ndefFileContent = new byte[totalLength + 2];
        ndefFileContent[0] = (byte) ((totalLength >> 8) & 0xFF);
        ndefFileContent[1] = (byte) (totalLength & 0xFF);
        System.arraycopy(ndefMessage, 0, ndefFileContent, 2, totalLength);

        return ndefFileContent;
    }

    private byte[] createResponse(byte[] content, int offset, int length) {
        if (offset >= content.length) {
            return APDU_RESPONSE_FAILURE;
        }
        
        int end = content.length;
        if (length > 0 && offset + length < end) {
            end = offset + length;
        }

        byte[] slice = Arrays.copyOfRange(content, offset, end);
        byte[] response = new byte[slice.length + 2];
        System.arraycopy(slice, 0, response, 0, slice.length);
        System.arraycopy(APDU_RESPONSE_SUCCESS, 0, response, slice.length, 2);
        return response;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
