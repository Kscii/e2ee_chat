# API Configuration File

This directory contains the API configuration files for the application, which are used to store default API keys and service addresses.

## File Description

- `apiConfig.ts`: Stores default API keys and service addresses

## Usage

1. Set the default API keys and service addresses in the `apiConfig.ts` file
2. If default values are not needed, set the corresponding values to an empty string
3. The application will prioritize the values configured by the user. If the user has not configured a value, the default value will be used

## Configuration Items

- **OpenAI API Key**: Used for AI chat functionality
- **Azure TTS Service Configuration**: Used for Azure Text-to-Speech functionality
  - API Key
  - Region
- **Google TTS Service Configuration**: Used for Google Text-to-Speech functionality
  - API Key
- **GPT-SoVITS Service Configuration**: Used for GPT-SoVITS Text-to-Speech functionality
  - Service URL

---

# API 配置文件

此目录包含应用程序的 API 配置文件，用于存储默认的 API 密钥和服务地址。

## 文件描述

- `apiConfig.ts`：存储默认的 API 密钥和服务地址

## 使用方法

1. 在 `apiConfig.ts` 文件中设置默认的 API 密钥和服务地址。
2. 如果不需要默认值，则将相应的值设为空字符串。
3. 应用程序会优先使用用户配置的值。如果用户未配置，则使用默认值。

## 配置项

- **OpenAI API 密钥**：用于 AI 聊天功能
- **Azure TTS 服务配置**：用于 Azure 文本转语音功能
  - API 密钥
  - 区域
- **Google TTS 服务配置**：用于 Google 文本转语音功能
  - API 密钥
- **GPT-SoVITS 服务配置**：用于 GPT-SoVITS 文本转语音功能
  - 服务 URL

