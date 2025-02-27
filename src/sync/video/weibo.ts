import type { VideoData, SyncData } from '../common';

export async function VideoWeibo(data: SyncData) {
  const { content, video, title } = data.data as VideoData;

  function waitForElement(selector: string, timeout = 10000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  // 辅助函数：等待多个元素出现
  function waitForElements(selector: string, count: number, timeout = 30000): Promise<Element[]> {
    return new Promise((resolve, reject) => {
      const checkElements = () => {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= count) {
          resolve(Array.from(elements));
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`未能在 ${timeout}ms 内找到 ${count} 个 "${selector}" 元素`));
          return;
        }

        setTimeout(checkElements, 100);
      };

      const startTime = Date.now();
      checkElements();
    });
  }

  // 辅助函数：上传文件
  async function uploadFiles() {
    const fileInput = (await waitForElement('input[type="file"]')) as HTMLInputElement;
    if (!fileInput) {
      console.error('未找到文件输入元素');
      return;
    }

    const dataTransfer = new DataTransfer();

    // 只处理视频文件
    if (video.type.startsWith('video/')) {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const videoFile = new File([blob], video.name, { type: video.type });
      console.log(`文件: ${videoFile.name} ${videoFile.type} ${videoFile.size}`);
      dataTransfer.items.add(videoFile);
    }

    if (dataTransfer.files.length > 0) {
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 等待文件处理
      console.log('文件上传操作完成');
    } else {
      console.error('没有成功添加任何文件');
    }
  }

  try {
    // 使用 findElementByText 函数查找输入元素
    const inputElement = (await waitForElement(
      'textarea[placeholder="有什么新鲜事想分享给大家？"]',
    )) as HTMLTextAreaElement;

    if (!inputElement) {
      throw new Error('未找到微博输入框');
    }

    // 组合标题和内容
    const fullContent = `${title}\n${content}`;

    // 填写内容
    inputElement.value = fullContent;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    console.log('成功填入微博内容');

    // 处理视频上传
    if (video) {
      await uploadFiles();
      await waitForElements('i[title="删除"]', 1);
    }

    console.log('成功填入微博内容和视频');

    // 处理自动发布
    if (data.auto_publish) {
      const sendButtons = document.querySelectorAll('span.woo-button-content');
      const sendButton = Array.from(sendButtons).find((button) => button.textContent?.includes('发送'));

      if (sendButton) {
        console.log('点击发送按钮');
        (sendButton as HTMLElement).click();
        await new Promise((resolve) => setTimeout(resolve, 3000));
        window.location.reload();
      } else {
        console.log("未找到'发送'按钮");
      }
    }
  } catch (error) {
    console.error('填入微博内容或上传视频时出错:', error);
  }
}
