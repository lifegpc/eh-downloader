cmake_minimum_required(VERSION 3.18)
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../cmake")

project(thumbnail)
if (MSVC)
    add_compile_options(/utf-8)
endif()

if (NOT TARGET utils)
    add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../utils" "${CMAKE_BINARY_DIR}/utils")
    include_directories("${CMAKE_CURRENT_SOURCE_DIR}/../utils")
endif()

find_package(AVFORMAT 58 REQUIRED)
find_package(AVCODEC 58 REQUIRED)
find_package(AVUTIL 56 REQUIRED)
find_package(SWSCALE 5 REQUIRED)

include(GNUInstallDirs)

add_library(thumbnail SHARED thumbnail.h thumbnail.c)
target_link_libraries(thumbnail AVFORMAT::AVFORMAT)
target_link_libraries(thumbnail AVCODEC::AVCODEC)
target_link_libraries(thumbnail AVUTIL::AVUTIL)
target_link_libraries(thumbnail SWSCALE::SWSCALE)
target_link_libraries(thumbnail utils)

install(TARGETS thumbnail)
