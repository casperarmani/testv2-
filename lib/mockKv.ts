class MockKV {
  private storage: { [key: string]: string[] } = {};

  async lrange(key: string, start: number, end: number): Promise<string[]> {
    const list = this.storage[key] || [];
    if (end === -1) end = list.length;
    return list.slice(start, end);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.storage[key]) {
      this.storage[key] = [];
    }
    this.storage[key].push(...values);
    return this.storage[key].length;
  }

  async ltrim(key: string, start: number, end: number): Promise<'OK'> {
    if (this.storage[key]) {
      this.storage[key] = this.storage[key].slice(start, end === -1 ? undefined : end + 1);
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (this.storage[key]) {
      delete this.storage[key];
      return 1;
    }
    return 0;
  }
}

export const mockKv = new MockKV();