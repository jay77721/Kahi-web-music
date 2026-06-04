/**
 * Reusable mock data for tests.
 * Centralizes test fixtures so they stay consistent across test files.
 */

export const mockSong = {
  id: 1001,
  name: '晴天',
  ar: [{ id: 101, name: '周杰伦' }],
  al: { id: 201, name: '叶惠美', picUrl: 'https://pics.example.com/album/201.jpg' },
  dt: 269000,
  fee: 0,
  st: 0,
  alia: [],
  pop: 95,
  mark: 0,
};

export const mockArtist = {
  id: 101,
  name: '周杰伦',
  picUrl: 'https://pics.example.com/artist/101.jpg',
  albumSize: 15,
  musicSize: 200,
  mvSize: 50,
  followed: false,
  briefDesc: '华语流行歌手',
};

export const mockAlbum = {
  id: 201,
  name: '叶惠美',
  picUrl: 'https://pics.example.com/album/201.jpg',
  artist: { id: 101, name: '周杰伦' },
  publishTime: 1057324800000,
  company: '杰威尔音乐',
  description: '经典专辑',
  tags: ['流行', '华语'],
  size: 11,
  songs: [mockSong],
};

export const mockPlaylist = {
  id: 3001,
  name: '华语经典老歌',
  coverImgUrl: 'https://pics.example.com/playlist/3001.jpg',
  creator: { userId: 1, nickname: '音乐爱好者' },
  description: '那些年我们一起听过的歌',
  playCount: 1234567,
  trackCount: 50,
  tracks: [mockSong],
  subscribed: false,
};

export const mockComment = {
  id: 5001,
  user: { userId: 1, nickname: '乐迷', avatarUrl: 'https://pics.example.com/user/1.jpg' },
  content: '太好听了！百听不厌',
  time: 1699900000000,
  likedCount: 128,
  liked: false,
  replyCount: 5,
};

export const mockMV = {
  id: 6001,
  name: '晴天 MV',
  artistName: '周杰伦',
  cover: 'https://pics.example.com/mv/6001.jpg',
  playCount: 5000000,
  publishTime: 1057324800000,
  duration: 269,
};

export const mockUser = {
  userId: 1,
  nickname: '音乐达人',
  avatarUrl: 'https://pics.example.com/user/1.jpg',
  level: 8,
  vipType: 11,
  follows: 120,
  followers: 3400,
  playlists: [mockPlaylist],
};

export const mockSearchResult = {
  result: {
    songs: { songCount: 100, songs: [mockSong] },
    playlists: { playlistCount: 50, playlists: [mockPlaylist] },
    artists: { artistCount: 30, artists: [mockArtist] },
    albums: { albumCount: 40, albums: [mockAlbum] },
    mvs: { mvCount: 20, mvs: [mockMV] },
  },
};

export const mockLrc = `
[00:00.00]晴天 - 周杰伦
[00:12.50]故事的小黄花
[00:18.30]从出生那年就飘着
[00:24.10]童年的荡秋千
[00:29.80]随记忆一直晃到现在
`;

export const mockApiResponse = {
  code: 200,
  message: 'success',
  data: mockSong,
};

export const mockApiResponseList = {
  code: 200,
  message: 'success',
  data: [mockSong, mockSong, mockSong],
};
